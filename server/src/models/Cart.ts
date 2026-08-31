import { Schema, model } from "mongoose";

const cartItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: String,
    name: String,
    price: Number,
    quantity: { type: Number, required: true, default: 1 },
    image: String,
});

// Snapshot of an applied offer (stored on the cart for reference)
const appliedOfferSchema = new Schema(
    {
        offerId: { type: Schema.Types.ObjectId, ref: "Offer" },
        offerTitle: String,
        discountAmount: Number,
    },
    { _id: false }
);

// Snapshot of an applied coupon (stored on the cart for reference)
const appliedCouponSchema = new Schema(
    {
        couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
        code: String,
        discountAmount: Number,
    },
    { _id: false }
);

const cartSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        storeId: { type: String, default: "1" },
        items: [cartItemSchema],

        // ── Legacy coupon fields (kept for backward-compat) ───────────────────
        couponCode: { type: String, default: "" },
        discount: { type: Number, default: 0 },

        // ── Offer engine output ───────────────────────────────────────────────
        appliedOffers: [appliedOfferSchema],   // always max 1 entry (best offer wins)
        offerDiscount: { type: Number, default: 0 },

        // ── Coupon engine output ──────────────────────────────────────────────
        appliedCoupon: appliedCouponSchema,
        couponDiscount: { type: Number, default: 0 },

        expectedDeliveryDate: Date,
        deliveryPostalCode: String,
        subtotal: Number,
        total: Number,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

export const Cart = model("Cart", cartSchema);

