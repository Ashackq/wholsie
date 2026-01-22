import { Schema, model } from "mongoose";

const categorySchema = new Schema(
    {
        name: { type: String, required: true, unique: true },
        description: String,
        image: String,
        slug: { type: String, unique: true, lowercase: true },
        metaTitle: String,
        metaDescription: String,
        status: { type: String, enum: ["active", "inactive"], default: "active" },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

export const ProductCategory = model("ProductCategory", categorySchema);
