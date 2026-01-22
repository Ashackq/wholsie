import { Schema, model } from "mongoose";

const variantSchema = new Schema(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true }, // "Color", "Size", "Material"
        values: [{ type: String }], // ["Red", "Blue", "Green"]
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const Variant = model("Variant", variantSchema);
