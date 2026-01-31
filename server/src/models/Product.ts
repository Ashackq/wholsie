import { Schema, model } from "mongoose";

const variantSchema = new Schema({
  name: String, // e.g., "Size", "Color"
  value: String, // e.g., "M", "Red"
});

const productSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    title: { type: String, required: true }, // Alias for name
    description: String,
    sku: { type: String, unique: true, sparse: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "ProductCategory" },
    image: String,
    images: [String],
    price: { type: Number, required: true },
    salePrice: { type: Number },
    discountedPrice: { type: Number }, // Alias for salePrice
    discount: { type: Number, default: 0 }, // Discount percentage
    quantity: { type: Number, default: 0 },
    stock: { type: Number, default: 0 }, // Alias for quantity
    variants: [variantSchema],
    // Product details for specs table
    material: String,
    style: String,
    weight: Number, // grams
    packetCount: { type: Number, default: 1 }, // number of packets in this product (1 for single, N for combos)
    shelfLife: String,
    features: String,
    dietType: String,
    storage: String,
    country: String,
    // Review fields
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 }, // Alias for reviewCount
    metaTitle: String,
    metaDescription: String,
    metaKeywords: String,
    isRecentLaunch: { type: Boolean, default: false },
    isCombo: { type: Boolean, default: false },
    slug: { type: String, unique: true, sparse: true, lowercase: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", description: "text" });

export const Product = model("Product", productSchema);
