import { Schema, model } from "mongoose";

const offerRuleSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "buy_x_get_y_free",
        "percentage_discount",
        "fixed_discount",
        "combo_discount",
        "minimum_cart_discount",
        "free_shipping",
      ],
      required: true,
    },

    // ── buy_x_get_y_free ─────────────────────────────────────────────────────
    buyQuantity: Number,   // e.g. 2 (buy 2 …)
    getQuantity: Number,   // e.g. 1 (… get 1 free)
    getFreeProductId: {    // null = same product; ObjectId = a different free product
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    // ── percentage / fixed ───────────────────────────────────────────────────
    discountValue: Number,        // % or flat ₹ amount
    maxDiscountAmount: Number,    // cap for percentage offers (optional)

    // ── combo_discount ────────────────────────────────────────────────────────
    comboProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    comboPrice: Number,           // total combo price (eligible subtotal - comboPrice = discount)

    // ── minimum_cart_discount ─────────────────────────────────────────────────
    minimumCartValue: Number,
    minimumCartDiscountType: {
      type: String,
      enum: ["percentage", "fixed"],
    },
  },
  { _id: false }
);

const offerSchema = new Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    title: { type: String, required: true },
    description: String,
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    internalNote: String, // admin-only, not exposed to public

    // ── Visuals ───────────────────────────────────────────────────────────────
    image: String,         // primary banner image
    images: [String],      // additional gallery images
    badgeText: String,     // e.g. "🔥 HOT DEAL"
    ctaText: { type: String, default: "Shop Now" },

    // ── Terms & SEO ───────────────────────────────────────────────────────────
    termsAndConditions: String,
    metaTitle: String,
    metaDescription: String,

    // ── Rule ──────────────────────────────────────────────────────────────────
    rule: { type: offerRuleSchema, required: true },

    // ── Scope ─────────────────────────────────────────────────────────────────
    // Both empty ⇒ cart-wide (valid only for minimum_cart_discount & free_shipping)
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: "ProductCategory" }],

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    isActive: { type: Boolean, default: false },
    startDate: Date,
    endDate: Date,

    // ── Display ───────────────────────────────────────────────────────────────
    displayOnProductsPage: { type: Boolean, default: true },
    displayOnHomepage: { type: Boolean, default: false },

    // ── Priority ──────────────────────────────────────────────────────────────
    // Tiebreaker when two offers have the same discountAmount; higher wins.
    priority: { type: Number, default: 0 },

    // ── Limits ────────────────────────────────────────────────────────────────
    maxUsageTotal: Number,    // null = unlimited
    maxUsagePerUser: Number,  // null = unlimited
    usageCount: { type: Number, default: 0 },

    // ── Analytics ─────────────────────────────────────────────────────────────
    viewCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    addToCartCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Compound index for engine queries ─────────────────────────────────────────
// Fetches all active offers that haven't exceeded maxUsageTotal
offerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
offerSchema.index({ slug: 1 }, { unique: true });

export const Offer = model("Offer", offerSchema);
