import { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { User } from "../models/User.js";
import { Address } from "../models/Address.js";
import { Offer } from "../models/Offer.js";
import { Coupon } from "../models/Coupon.js";
import { getInvoiceUrl } from "../utils/invoiceGenerator.js";
import { getShippingCharges } from "../utils/delhivery.js";
import { calculateCartWeight } from "../utils/orderWeightCalculator.js";
import {
  enrichCartItems,
  evaluateOffers,
} from "../services/offerEngine.js";
import { applyCoupon } from "../services/couponEngine.js";
import { env } from "../config/env.js";

// ── Shipping helpers ──────────────────────────────────────────────────────────

/**
 * Weight-based shipping fallback when Delhivery API is unavailable.
 * ₹50 base up to 500g; +₹10 per 100g slab thereafter.
 */
function weightBasedShippingFallback(shipmentWeightGrams: number): number {
  if (shipmentWeightGrams <= 0) return 0;
  if (shipmentWeightGrams <= 500) return 50;
  const extraSlabs = Math.ceil((shipmentWeightGrams - 500) / 100);
  return 50 + extraSlabs * 10;
}

/**
 * Resolve shipping cost server-side.
 * Tries Delhivery API first; falls back to weight-based formula on any error.
 * The frontend-supplied shippingCost is NEVER used.
 */
async function resolveShippingCost(params: {
  destinationPincode: string;
  shipmentWeightGrams: number;
  paymentMethod: string;
}): Promise<number> {
  const { destinationPincode, shipmentWeightGrams, paymentMethod } = params;
  const originPin = env.SELLER_PINCODE;

  if (originPin && env.DELHIVERY_TOKEN && destinationPincode) {
    try {
      const paymentMode = paymentMethod === "cod" ? "COD" : "Pre-paid";
      const result = await getShippingCharges({
        originPin,
        destinationPin: destinationPincode,
        weight: shipmentWeightGrams,
        paymentMode,
      });
      const apiCost = result.total_amount ?? result.delivery_charges;
      if (typeof apiCost === "number" && apiCost >= 0) {
        return Math.round(apiCost);
      }
    } catch {
      // fall through to weight-based fallback
    }
  }

  return weightBasedShippingFallback(shipmentWeightGrams);
}

/**
 * Create order from cart — ALL computation is server-side (Phase 4).
 *
 * Steps per implementation plan §7:
 *  1.  FETCH  Cart.populate('items.productId')
 *  2.  PRICES from DB: variant.price || salePrice || price per item
 *  3.  WEIGHT from DB: product.weight || 100 per item (default)
 *  4.  SUBTOTAL: Σ(price × quantity)
 *  5.  TOTAL WEIGHT: Σ(weight × quantity)
 *  6.  BOXES:   calculateCartWeight()
 *  7.  SHIPPING: Delhivery API or weight-based fallback (frontendShippingCost IGNORED)
 *  8.  OFFER:   evaluateOffers() → offerDiscount, freeItems (added at price:0)
 *  9.  COUPON:  if couponCode in body AND offerDiscount == 0 → applyCoupon()
 *  10. NET:     subtotal + shipping − offerDiscount − couponDiscount (min 1)
 *  11. SAVE     Order with full snapshot: prices, weights, appliedOffers, appliedCoupon
 *  12. INCREMENT offer.usageCount++ and coupon.usageCount++ (atomic $inc)
 *  13. RETURN   { netAmount, warnings[] }
 */
export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.userId!;
    const {
      addressId,
      paymentMethod,
      couponCode,
      // frontendShippingCost is intentionally destructured but NEVER used (security policy)
      shippingCost: _ignoredFrontendShippingCost,
    } = req.body;

    if (!addressId) {
      return res.status(400).json({ error: "Address ID is required" });
    }

    // ── 1. FETCH cart ─────────────────────────────────────────────────────────
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // ── Validate address ──────────────────────────────────────────────────────
    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) {
      return res.status(400).json({ error: "Invalid address" });
    }

    // ── Validate user profile ─────────────────────────────────────────────────
    const user = await User.findById(userId);
    if (!user?.email || user.email.includes("phonenumber@")) {
      return res.status(400).json({
        error: "Please update your email address before placing an order",
        requiresProfileUpdate: true,
      });
    }

    // Support both firstName/lastName and legacy name field
    const firstName =
      (user as any).firstName || (user as any).name?.split(" ")[0] || "";
    const lastName =
      (user as any).lastName ||
      (user as any).name?.split(" ").slice(1).join(" ") ||
      "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (!fullName || /^user\d*$/i.test(fullName)) {
      return res.status(400).json({
        error: "Please update your name before placing an order",
        requiresProfileUpdate: true,
      });
    }

    // ── 2 & 3. ENRICH cart items with DB prices, weights, categoryId, stock ──
    // enrichCartItems() fetches salePrice || price and weight from the DB.
    // This is the single source of truth — no frontend price values are trusted.
    const cartItemDocs = cart.items as any[];
    const enrichedItems = await enrichCartItems(
      cartItemDocs.map((item: any) => ({
        productId: item.productId?._id ?? item.productId,
        variantId: item.variantId,
        name: item.name,
        price: item.price,       // stored front-price (ignored for discount logic)
        quantity: item.quantity,
        image: item.image,
      })),
    );

    // ── 2. PRICES — resolve variant price server-side where applicable ─────
    const orderItems: Array<{
      productId: any;
      variantId?: any;
      name: string;
      quantity: number;
      price: number;
      weight: number;
      total: number;
      image?: string;
      isFreeItem: boolean;
    }> = enrichedItems.map((enriched, idx) => {
      const cartItem = cartItemDocs[idx];
      const productDoc = cartItem?.productId; // populated Mongoose doc

      // Variant price takes precedence when present (resolved server-side)
      let price = enriched.dbPrice ?? 0;
      if (productDoc && typeof productDoc === "object") {
        const variant = productDoc.variants?.[cartItem.variantIndex ?? 0];
        if (variant?.price != null) {
          price = variant.price;
        }
      }

      return {
        productId: enriched.productId,
        variantId: enriched.variantId,
        name: enriched.name ?? "Product",
        quantity: enriched.quantity,
        price,
        weight: enriched.dbWeight ?? 100,
        total: price * enriched.quantity,
        image: enriched.image,
        isFreeItem: false,
      };
    });

    // ── 4. SUBTOTAL ───────────────────────────────────────────────────────────
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);

    // ── 5 & 6. TOTAL WEIGHT + BOX SELECTION ──────────────────────────────────
    const weightCalc = calculateCartWeight(
      orderItems.map((i) => ({ weight: i.weight, quantity: i.quantity })),
    );
    const { shipmentWeight, selectedBox, requiresMPS, mpsBoxCount } = weightCalc;

    // ── 7. SHIPPING — server-side only; frontend value ignored ────────────────
    let shippingCost = await resolveShippingCost({
      destinationPincode: address.pincode,
      shipmentWeightGrams: shipmentWeight,
      paymentMethod: paymentMethod ?? "razorpay",
    });

    // ── 8. OFFER ENGINE ───────────────────────────────────────────────────────
    const offerResult = await evaluateOffers(enrichedItems);
    const offerDiscount = offerResult.offerDiscount;
    const warnings: string[] = [...offerResult.warnings];

    // free_shipping offer or subtotal >= 500: override resolved shipping cost to 0
    if (offerResult.freeShipping || subtotal >= 500) {
      shippingCost = 0;
    }

    // Append free items at price ₹0 to the order items list
    for (const fi of offerResult.freeItems) {
      orderItems.push({
        productId: fi.productId,
        variantId: undefined,
        name: fi.productName,
        quantity: fi.quantity,
        price: 0,
        weight: 0,
        total: 0,
        image: undefined,
        isFreeItem: true,
      });
    }

    // ── 9. COUPON ENGINE (only when no active offer) ─────────────────────────
    let couponDiscount = 0;
    let appliedCouponSnapshot: {
      couponId: any;
      code: string;
      discountAmount: number;
    } | null = null;

    const isOfferActive =
      offerDiscount > 0 ||
      offerResult.appliedOffer != null ||
      offerResult.freeItems.length > 0;

    if (couponCode && typeof couponCode === "string" && !isOfferActive) {
      const couponResult = await applyCoupon(
        couponCode,
        enrichedItems.map((i) => ({
          productId: i.productId,
          categoryId: i.categoryId,
          dbPrice: i.dbPrice ?? 0,
          quantity: i.quantity,
        })),
        isOfferActive,
        userId,
      );

      if (couponResult.success) {
        couponDiscount = couponResult.discountAmount;
        appliedCouponSnapshot = {
          couponId: couponResult.couponId,
          code: couponResult.code,
          discountAmount: couponResult.discountAmount,
        };
      } else {
        // Non-fatal: surface coupon rejection reason as a warning
        warnings.push(`Coupon not applied: ${couponResult.reason}`);
      }
    } else if (couponCode && isOfferActive) {
      // Mutual exclusion: offer is active; coupon silently skipped
      warnings.push(
        "Coupon not applied: coupon codes cannot be combined with active promotional offers.",
      );
    }

    // ── 10. NET AMOUNT ────────────────────────────────────────────────────────
    // Minimum 1 to satisfy Razorpay's minimum order amount requirement.
    const netAmount = Math.max(
      1,
      subtotal + shippingCost - offerDiscount - couponDiscount,
    );

    // ── 11. SAVE ORDER with full snapshot ─────────────────────────────────────
    const order = new Order({
      orderId: `ORD-${Date.now()}`,
      userId,
      items: orderItems,
      shippingAddress: {
        street: address.address,
        city: address.city,
        state: address.state,
        postalCode: address.pincode,
        country: "India",
      },
      paymentMethod,
      paymentStatus: "pending",
      status: "pending",

      // ── Price breakdown (all server-computed) ─────────────────────────────
      subtotal,
      shippingCost,
      offerDiscount,
      couponDiscount,
      discount: offerDiscount + couponDiscount,   // legacy field (sum of all discounts)
      total: subtotal + shippingCost,              // legacy field (gross pre-discount total)
      netAmount,

      // ── Offer snapshot (max 1 entry — best offer wins) ────────────────────
      appliedOffers: offerResult.appliedOffer
        ? [
            {
              offerId: offerResult.appliedOffer.offerId,
              offerTitle: offerResult.appliedOffer.offerTitle,
              offerSlug: offerResult.appliedOffer.offerSlug,
              discountAmount: offerResult.appliedOffer.discountAmount,
            },
          ]
        : [],

      // ── Coupon snapshot ───────────────────────────────────────────────────
      appliedCoupon: appliedCouponSnapshot ?? undefined,
    });

    await order.save();

    // ── 12. INCREMENT usage counts (atomic $inc) ──────────────────────────────
    if (offerResult.appliedOffer?.offerId) {
      await Offer.updateOne(
        { _id: offerResult.appliedOffer.offerId },
        { $inc: { usageCount: 1 } },
      );
    }

    if (appliedCouponSnapshot?.couponId) {
      await Coupon.updateOne(
        { _id: appliedCouponSnapshot.couponId },
        { $inc: { usageCount: 1 } },
      );
    }

    // ── 13. RETURN ────────────────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "Order created",
      data: {
        orderId: order._id,
        orderNumber: order.orderId,
        // Full server-computed price breakdown for frontend display
        subtotal,
        shippingCost,
        offerDiscount,
        couponDiscount,
        netAmount,
        appliedOffer: offerResult.appliedOffer ?? null,
        appliedCoupon: appliedCouponSnapshot,
        freeItems: offerResult.freeItems,
        // Shipment metadata
        shipmentWeight,
        requiresMPS,
        mpsBoxCount,
        selectedBox: (selectedBox as any)?.name,
        warnings,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user's orders
 */
export async function getUserOrders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.userId!;
    const { limit = 10, offset = 0 } = req.query;

    const orders = await Order.find({ userId })
      .populate("invoiceId", "invoiceNumber invoiceDate")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string));

    const total = await Order.countDocuments({ userId });

    // Add invoice URL to each order
    const ordersWithInvoiceUrl = orders.map((order) => {
      const orderObj: any = order.toObject();
      if (orderObj.invoiceId) {
        const invoiceId =
          typeof orderObj.invoiceId === "object" && orderObj.invoiceId._id
            ? orderObj.invoiceId._id.toString()
            : orderObj.invoiceId.toString();
        orderObj.invoiceUrl = getInvoiceUrl(invoiceId);
      }
      return orderObj;
    });

    res.json({
      success: true,
      data: ordersWithInvoiceUrl,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get specific order details
 */
export async function getOrderDetails(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.userId!;
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, userId }).populate(
      "invoiceId",
      "invoiceNumber invoiceDate",
    );
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderObj: any = order.toObject();

    // Add invoice URL if invoice exists
    if (orderObj.invoiceId) {
      const invoiceId =
        typeof orderObj.invoiceId === "object" && orderObj.invoiceId._id
          ? orderObj.invoiceId._id.toString()
          : orderObj.invoiceId.toString();
      orderObj.invoiceUrl = getInvoiceUrl(invoiceId);
    }

    res.json({
      success: true,
      data: orderObj,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel order
 */
export async function cancelOrder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.userId!;
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Only allow cancellation if order is pending
    if (
      order.paymentStatus === "completed" ||
      order.status === "processing" ||
      order.status === "shipped" ||
      order.status === "delivered"
    ) {
      return res
        .status(400)
        .json({ error: "Cannot cancel orders that are processing, shipped, or delivered" });
    }

    await order.deleteOne();

    res.json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    next(error);
  }
}
