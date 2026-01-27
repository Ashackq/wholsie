import { Schema, model } from "mongoose";

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product" },
  name: String,
  price: Number,
  quantity: Number,
  weight: Number, // Product weight in grams (snapshot at order creation)
  image: String,
});

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
    subtotal: Number,
    tax: Number,
    shippingCost: Number,
    platformFee: Number, // 2% platform fee
    discount: Number,
    total: Number,
    // Delhivery shipment tracking
    delhiveryTrackingId: String,
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
