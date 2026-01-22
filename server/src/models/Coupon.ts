import { Schema, model } from "mongoose";

const couponSchema = new Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true },
        description: { type: String },
        discountType: { type: String, enum: ["percentage", "fixed"], required: true },
        discountValue: { type: Number, required: true, min: 0 },
        maxDiscount: { type: Number }, // Max discount amount for percentage-based
        minPurchaseAmount: { type: Number, default: 0 },
        usageLimit: { type: Number }, // Total times coupon can be used
        usagePerUser: { type: Number, default: 1 }, // Times per user
        usageCount: { type: Number, default: 0 },
        applicableCategories: [{ type: Schema.Types.ObjectId, ref: "ProductCategory" }],
        applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
        excludedProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
        validFrom: { type: Date, required: true },
        validTo: { type: Date, required: true },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const Coupon = model("Coupon", couponSchema);
