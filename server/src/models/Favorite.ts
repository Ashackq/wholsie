import { Schema, model } from "mongoose";

const favoriteSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Ensure one favorite per user-product combination
favoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const Favorite = model("Favorite", favoriteSchema);
