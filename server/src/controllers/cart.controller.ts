import { Request, Response, NextFunction } from 'express';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import {
    enrichCartItems,
    evaluateOffers,
} from '../services/offerEngine.js';
import {
    applyCoupon,
    buildOfferOverridesCouponWarning,
} from '../services/couponEngine.js';

/**
 * Get user's cart — runs offerEngine on every call so the discount is always fresh.
 *
 * Response shape (per implementation plan §8):
 * {
 *   items, subtotal, offerDiscount, couponDiscount,
 *   adjustedSubtotal, shippingEstimate,
 *   appliedOffers, freeItems, appliedCoupon,
 *   couponMessage, warnings
 * }
 */
export async function getCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
            await cart.save();
        }

        const warnings: string[] = [];

        // ── Empty cart — return bare response ─────────────────────────────────
        if (!cart.items.length) {
            return res.json({
                success: true,
                data: {
                    items: [],
                    subtotal: 0,
                    offerDiscount: 0,
                    couponDiscount: 0,
                    adjustedSubtotal: 0,
                    shippingEstimate: 0,
                    appliedOffers: [],
                    freeItems: [],
                    appliedCoupon: null,
                    couponMessage: null,
                    warnings: [],
                    // Raw cart fields still sent for backward-compat
                    _id: cart._id,
                    userId: cart.userId,
                },
            });
        }

        // ── Enrich items from DB ───────────────────────────────────────────────
        const enrichedItems = await enrichCartItems(
            cart.items.map((item: any) => ({
                productId: item.productId,
                variantId: item.variantId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
            })),
        );

        const subtotal = enrichedItems.reduce(
            (sum, i) => sum + (i.dbPrice ?? 0) * i.quantity,
            0,
        );

        // ── Run offer engine ───────────────────────────────────────────────────
        const offerResult = await evaluateOffers(enrichedItems);
        const offerDiscount = offerResult.offerDiscount;
        warnings.push(...offerResult.warnings);

        // ── Shipping estimate (simple weight-based; exact cost computed at order) ──
        // 0 if free_shipping offer won; else basic slab
        let shippingEstimate = 0;
        if (!offerResult.freeShipping) {
            shippingEstimate = subtotal >= 500 ? 0 : 50; // rough estimate only
        }

        // ── Mutual exclusion: if offer just applied and coupon was set, clear it ─
        let appliedCoupon = cart.appliedCoupon ?? null;
        let couponDiscount = cart.couponDiscount ?? 0;
        let couponMessage: string | null = null;

        if (offerDiscount > 0 && appliedCoupon) {
            const warning = buildOfferOverridesCouponWarning(
                (appliedCoupon as any).code ?? 'your coupon',
            );
            warnings.push(warning);
            // Clear coupon from cart
            (cart as any).appliedCoupon = undefined;
            cart.couponDiscount = 0;
            (cart as any).couponCode = '';
            cart.discount = 0;
            await cart.save();
            appliedCoupon = null;
            couponDiscount = 0;
        }

        if (appliedCoupon) {
            couponMessage = `Coupon ${(appliedCoupon as any).code} applied — ₹${couponDiscount} off`;
        }

        // ── Persist latest offer engine output on the cart doc ────────────────
        // We don't block the response on this — fire-and-forget is fine here
        // because the offer is always re-evaluated at order creation time.
        const cartUpdate: Record<string, any> = {
            offerDiscount,
            appliedOffers: offerResult.appliedOffer
                ? [
                    {
                        offerId: offerResult.appliedOffer.offerId,
                        offerTitle: offerResult.appliedOffer.offerTitle,
                        discountAmount: offerResult.appliedOffer.discountAmount,
                    },
                ]
                : [],
        };
        Cart.updateOne({ _id: cart._id }, { $set: cartUpdate }).exec();

        const adjustedSubtotal = Math.max(0, subtotal - offerDiscount - couponDiscount);

        return res.json({
            success: true,
            data: {
                _id: cart._id,
                userId: cart.userId,
                items: enrichedItems.map((i) => ({
                    ...i,
                    // Expose DB price as the authoritative price
                    price: i.dbPrice ?? 0,
                })),
                subtotal,
                offerDiscount,
                couponDiscount,
                adjustedSubtotal,
                shippingEstimate,
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
                freeItems: offerResult.freeItems,
                appliedCoupon,
                couponMessage,
                warnings,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Apply coupon to cart
 * POST /api/cart/coupon
 * Body: { couponCode: string }
 *
 * Blocked if an offer is currently active (mutual exclusion policy).
 * On success, persists coupon snapshot on the Cart document.
 */
export async function applyCouponToCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { couponCode } = req.body;

        if (!couponCode || typeof couponCode !== 'string') {
            return res.status(400).json({ error: 'couponCode is required.' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: 'Your cart is empty.' });
        }

        // Enrich + evaluate offers to check mutual exclusion
        const enrichedItems = await enrichCartItems(
            cart.items.map((item: any) => ({
                productId: item.productId,
                variantId: item.variantId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
            })),
        );

        const offerResult = await evaluateOffers(enrichedItems);

        // Run coupon engine (it enforces mutual exclusion internally too)
        const couponResult = await applyCoupon(
            couponCode,
            enrichedItems.map((i) => ({
                productId: i.productId,
                categoryId: i.categoryId,
                dbPrice: i.dbPrice ?? 0,
                quantity: i.quantity,
            })),
            offerResult.offerDiscount,
            userId,
        );

        if (!couponResult.success) {
            return res.status(400).json({
                success: false,
                error: couponResult.reason,
            });
        }

        // Persist coupon snapshot on Cart
        (cart as any).appliedCoupon = {
            couponId: couponResult.couponId,
            code: couponResult.code,
            discountAmount: couponResult.discountAmount,
        };
        cart.couponDiscount = couponResult.discountAmount;
        (cart as any).couponCode = couponResult.code; // legacy field
        cart.discount = couponResult.discountAmount;   // legacy field
        await cart.save();

        return res.json({
            success: true,
            message: couponResult.message,
            data: {
                appliedCoupon: {
                    couponId: couponResult.couponId,
                    code: couponResult.code,
                    discountAmount: couponResult.discountAmount,
                },
                couponDiscount: couponResult.discountAmount,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Remove coupon from cart
 * DELETE /api/cart/coupon
 *
 * Clears the coupon snapshot and resets couponDiscount to 0.
 */
export async function removeCouponFromCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found.' });
        }

        (cart as any).appliedCoupon = undefined;
        cart.couponDiscount = 0;
        (cart as any).couponCode = '';
        cart.discount = 0;
        await cart.save();

        return res.json({
            success: true,
            message: 'Coupon removed.',
        });
    } catch (error) {
        next(error);
    }
}



/**
 * Add item to cart
 */
export async function addToCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { productId, variantIndex = 0, quantity = 1 } = req.body;

        if (!productId || quantity < 1) {
            return res.status(400).json({ error: 'Invalid product or quantity' });
        }

        // Verify product exists and is active
        const product = await Product.findOne({ _id: productId, status: 'active' });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId,
                items: []
            });
        }

        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(
            (item) =>
                item.productId.toString() === productId &&
                item.variantId === variantIndex.toString()
        );

        if (existingItemIndex > -1) {
            // Update existing item quantity
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new item
            cart.items.push({
                productId,
                variantId: variantIndex.toString(),
                quantity,
                addedAt: new Date()
            } as any);
        }

        await cart.save();

        await cart.populate({
            path: 'items.productId',
            select: 'name images price salePrice discount variants'
        });

        res.json({
            success: true,
            message: 'Item added to cart',
            data: cart
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (quantity < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const item = cart.items.find((i) => i._id?.toString() === itemId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        item.quantity = quantity;
        await cart.save();

        res.json({
            success: true,
            message: 'Cart updated'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { itemId } = req.params;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex((i) => i._id?.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();

        res.json({
            success: true,
            message: 'Item removed from cart'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Clear entire cart
 */
export async function clearCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        (cart as any).items = [];
        await cart.save();

        res.json({
            success: true,
            message: 'Cart cleared'
        });
    } catch (error) {
        next(error);
    }
}

