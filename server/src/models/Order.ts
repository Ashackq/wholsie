import { Schema, model } from "mongoose";

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product" },
  name: String,
  price: Number,
  quantity: Number,
  weight: Number, // Product weight in grams (snapshot at order creation)
  image: String,
  isFreeItem: { type: Boolean, default: false }, // true for items granted by buy_x_get_y_free
});

// Snapshot of the winning offer applied at order creation time
const appliedOfferSnapshotSchema = new Schema(
  {
    offerId: { type: Schema.Types.ObjectId, ref: "Offer" },
    offerTitle: String,
    offerSlug: String,
    discountAmount: Number,
  },
  { _id: false }
);

// Snapshot of the coupon applied at order creation time
const appliedCouponSnapshotSchema = new Schema(
  {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
    code: String,
    discountAmount: Number,
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderId: { type: String, unique: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    storeId: { type: String, default: "1" },
    items: [orderItemSchema],
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "razorpay" },
    razorpayOrderId: String,
    razorpayPaymentId: String,

    // ── Price breakdown (all server-computed) ─────────────────────────────────
    subtotal: Number,
    shippingCost: Number,
    discount: Number,    // legacy field (kept for backward-compat)
    offerDiscount: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    total: Number,       // legacy field (= subtotal + shipping before discounts)
    netAmount: Number,   // final amount charged: subtotal + shipping - offerDiscount - couponDiscount

    // ── Offer / coupon snapshots ───────────────────────────────────────────────
    // Stored so historical orders retain discount provenance even after offer/coupon changes.
    appliedOffers: [appliedOfferSnapshotSchema],   // max 1 entry
    appliedCoupon: appliedCouponSnapshotSchema,

    // Delhivery shipment tracking
    delhiveryTrackingId: String,
    mpsWaybills: [String], // For Multi-Package Shipments
    delhiveryShipmentStatus: String,
    delhiveryShipmentCreatedAt: Date,
    delhiveryPickupScheduled: Date,
    delhiveryDeliveredAt: Date,
    // Other integrations
    aisensynumber: String,
    // Invoice
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    notes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Order = model("Order", orderSchema);

