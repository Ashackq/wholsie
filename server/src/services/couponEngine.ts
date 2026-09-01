/**
 * Coupon Engine — server/src/services/couponEngine.ts
 *
 * Responsibilities:
 *  1. Validate a coupon code (isActive, dates, usage limits, per-user limit)
 *  2. Enforce mutual exclusion with active offers
 *  3. Determine eligible items (product / category scoped; excludedProducts applied)
 *  4. Enforce min purchase amount on eligible subtotal
 *  5. Calculate discount (% or fixed)
 *  6. Return structured result — never throws; always returns { success, ... }
 *
 * Caller contract:
 *  - Pass `offerDiscount` from offerEngine.evaluate() so mutual exclusion can be checked.
 *  - Pass `userId` + `Order` model for per-user usage check.
 */

import { Types } from "mongoose";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CouponCartItem {
    productId: Types.ObjectId | string;
    categoryId?: Types.ObjectId | string;
    dbPrice: number;   // server-side price (from enrichCartItems)
    quantity: number;
}

export interface CouponSuccess {
    success: true;
    couponId: Types.ObjectId | string;
    code: string;
    discountAmount: number;
    eligibleSubtotal: number;
    message: string;
}

export interface CouponFailure {
    success: false;
    code?: string;
    reason: string; // user-facing message
}

export type CouponResult = CouponSuccess | CouponFailure;

// ── Main apply function ───────────────────────────────────────────────────────

/**
 * Validates and applies a coupon code against the current cart state.
 *
 * @param rawCode     The coupon code submitted by the customer (will be normalised)
 * @param cartItems   Enriched cart items (must have dbPrice and categoryId set)
 * @param offerDiscountOrActive  Amount already discounted or boolean indicating if an offer is active
 * @param userId      The authenticated user's ObjectId (for per-user usage check)
 */
export async function applyCoupon(
    rawCode: string,
    cartItems: CouponCartItem[],
    offerDiscountOrActive: number | boolean,
    userId: Types.ObjectId | string
): Promise<CouponResult> {
    const isOfferActive =
        typeof offerDiscountOrActive === "boolean"
            ? offerDiscountOrActive
            : offerDiscountOrActive > 0;

    // ── Step 1: Normalise ────────────────────────────────────────────────────
    const code = rawCode.trim().toUpperCase();
    if (!code) {
        return { success: false, reason: "Please enter a coupon code." };
    }

    // ── Step 2: Find active coupon ────────────────────────────────────────────
    const now = new Date();
    const coupon = await Coupon.findOne({
        code,
        isActive: true,
        validFrom: { $lte: now },
        validTo: { $gte: now },
    }).lean();

    if (!coupon) {
        return { success: false, code, reason: "Invalid or expired coupon code." };
    }

    // ── Step 3: Total usage limit ─────────────────────────────────────────────
    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
        return { success: false, code, reason: "Coupon usage limit has been reached." };
    }

    // ── Step 4: Per-user usage limit ──────────────────────────────────────────
    if (coupon.usagePerUser != null && coupon.usagePerUser > 0) {
        const userUsageCount = await Order.countDocuments({
            userId,
            "appliedCoupon.code": code,
            paymentStatus: { $ne: "failed" },
        });
        if (userUsageCount >= coupon.usagePerUser) {
            return {
                success: false,
                code,
                reason: `You have already used this coupon ${coupon.usagePerUser === 1 ? "once" : `${coupon.usagePerUser} times`}.`,
            };
        }
    }

    // ── Step 5: Mutual exclusion with active offers ────────────────────────────
    if (coupon.cannotCombineWithOffers && isOfferActive) {
        return {
            success: false,
            code,
            reason: "Coupon codes cannot be combined with active promotional offers.",
        };
    }

    // ── Step 6: Determine eligible items ──────────────────────────────────────
    const applicableProductIds: string[] = (coupon.applicableProducts ?? []).map(
        (id: any) => id.toString()
    );
    const applicableCategoryIds: string[] = (coupon.applicableCategories ?? []).map(
        (id: any) => id.toString()
    );
    const excludedProductIds: string[] = (coupon.excludedProducts ?? []).map(
        (id: any) => id.toString()
    );

    const eligible = cartItems.filter((item) => {
        const pid = item.productId.toString();
        const cid = item.categoryId?.toString() ?? "";

        // Always exclude explicitly excluded products
        if (excludedProductIds.includes(pid)) return false;

        // Cart-wide (no product/category scope)
        if (applicableProductIds.length === 0 && applicableCategoryIds.length === 0) {
            return true;
        }

        // Product-scoped
        if (applicableProductIds.length > 0 && applicableProductIds.includes(pid)) {
            return true;
        }

        // Category-scoped
        if (applicableCategoryIds.length > 0 && cid && applicableCategoryIds.includes(cid)) {
            return true;
        }

        return false;
    });

    if (!eligible.length) {
        return {
            success: false,
            code,
            reason: "This coupon does not apply to any items in your cart.",
        };
    }

    // ── Step 7: Eligible subtotal ─────────────────────────────────────────────
    const eligibleSubtotal = eligible.reduce(
        (sum, item) => sum + item.dbPrice * item.quantity,
        0
    );

    // ── Step 8: Min purchase amount ───────────────────────────────────────────
    const minPurchase = coupon.minPurchaseAmount ?? 0;
    if (eligibleSubtotal < minPurchase) {
        return {
            success: false,
            code,
            reason: `A minimum purchase of ₹${minPurchase} on eligible items is required for this coupon.`,
        };
    }

    // ── Step 9: Calculate discount ────────────────────────────────────────────
    let discountAmount: number;

    if (coupon.discountType === "percentage") {
        discountAmount = (coupon.discountValue / 100) * eligibleSubtotal;
        if (coupon.maxDiscount != null && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount;
        }
    } else {
        // fixed
        discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
    }

    // Round to 2 decimal places (monetary)
    discountAmount = Math.round(discountAmount * 100) / 100;

    // ── Step 10: Return success ───────────────────────────────────────────────
    const discountDisplay =
        coupon.discountType === "percentage"
            ? `${coupon.discountValue}% off`
            : `₹${discountAmount} off`;

    return {
        success: true,
        couponId: coupon._id,
        code,
        discountAmount,
        eligibleSubtotal,
        message: `Coupon ${code} applied! ${discountDisplay} on eligible items.`,
    };
}

// ── Mutual exclusion warning helper ──────────────────────────────────────────

/**
 * Call this when the offer engine has auto-applied an offer AFTER a coupon
 * was already set on the cart. Returns a warning string to surface to the customer,
 * and indicates that the applied coupon should be cleared.
 */
export function buildOfferOverridesCouponWarning(couponCode: string): string {
    return `Your coupon ${couponCode} was removed because a better promotional offer is now active.`;
}
