import { Schema, model } from "mongoose";

const variantPriceSchema = new Schema(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        variantCombination: { type: Object, required: true }, // { color: "Red", size: "M" }
        price: { type: Number, required: true },
        originalPrice: { type: Number },
        stock: { type: Number, default: 0 },
        sku: { type: String, unique: true, sparse: true },
        image: { type: String },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const VariantPrice = model("VariantPrice", variantPriceSchema);
