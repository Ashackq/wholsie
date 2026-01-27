import { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { Address } from "../models/Address.js";
import { getInvoiceUrl } from "../utils/invoiceGenerator.js";

/**
 * Create order from cart
 */
export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.userId!;
    const { addressId, paymentMethod, couponCode, shippingCost: frontendShippingCost } = req.body;

    if (!addressId) {
      return res.status(400).json({ error: "Address ID is required" });
    }

    // Get cart
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Get address
    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) {
      return res.status(400).json({ error: "Invalid address" });
    }

    // Get user
    const user = await User.findById(userId);

    if (!user?.email || user.email.includes("phonenumber@")) {
      return res.status(400).json({
        error: "Please update your email address before placing an order",
        requiresProfileUpdate: true,
      });
    }

    // Check for name - support both firstName/lastName and legacy name field
    const firstName =
      (user as any).firstName || (user as any).name?.split(" ")[0] || "";
    const lastName =
      (user as any).lastName ||
      (user as any).name?.split(" ").slice(1).join(" ") ||
      "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (!fullName || /^user\d*$/i.test(fullName)) {
      return res.status(400).json({
        error: `Please update your name before placing an order`,
        requiresProfileUpdate: true,
      });
    }

    // Build order items
    const orderItems = cart.items.map((item: any) => {
      const product = item.productId;
      const variant = product.variants?.[item.variantIndex];
      const price = variant?.price || product.salePrice || product.price || 0;
      const weight = product.weight || 100; // Snapshot product weight (default 100g)

      return {
        productId: product._id,
        variantId: variant?._id,
        name: product.name,
        quantity: item.quantity,
        price,
        weight, // Add weight to order item
        total: price * item.quantity,
        tax: (price * item.quantity * (product.tax || 0)) / 100,
      };
    });

    // Calculate totals
    const subtotal = orderItems.reduce(
      (sum: number, item: any) => sum + item.total,
      0,
    );
    
    // Tax: 5% on subtotal
    const taxAmount = subtotal * 0.05;
    
    // Platform fee: 2% on subtotal
    const platformFee = subtotal * 0.02;
    
    // Use shipping cost from frontend if provided, otherwise calculate
    let deliveryCharge = 0;
    if (frontendShippingCost !== undefined) {
      deliveryCharge = frontendShippingCost;
    } else {
      // Fallback: free shipping above 500, else 50
      deliveryCharge = subtotal >= 500 ? 0 : 50;
    }
    
    const couponAmount = 0; // TODO: Apply coupon logic
    const netAmount = subtotal + taxAmount + platformFee + deliveryCharge - couponAmount;

    // Create order
    const order = new Order({
      orderId: `ORD-${Date.now()}`,
      userId,
      items: orderItems,
      subtotal,
      tax: taxAmount,
      platformFee,
      shippingCost: deliveryCharge,
      discount: couponAmount,
      total: netAmount,
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
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order created",
      data: { orderId: order._id, orderNumber: order.orderId },
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
      const orderObj = order.toObject();
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

    const orderObj = order.toObject();

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

    // Only allow cancellation if order is pending/unpaid
    if (
      order.paymentStatus === "completed" ||
      order.status === "shipped" ||
      order.status === "delivered"
    ) {
      return res
        .status(400)
        .json({ error: "Cannot cancel completed or shipped orders" });
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
