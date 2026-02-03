import { Schema, model } from "mongoose";

const reviewSchema = new Schema(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        title: { type: String, required: true },
        comment: { type: String },
        images: [{ type: String }],
        helpful: { type: Number, default: 0 },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        rejectionReason: { type: String },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const Review = model("Review", reviewSchema);
