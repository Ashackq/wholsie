import { Schema, model } from "mongoose";

const paymentSchema = new Schema(
    {
        orderId: { type: Schema.Types.ObjectId, ref: "Order" },
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,
        amount: Number,
        currency: { type: String, default: "INR" },
        status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
        method: { type: String, default: "razorpay" },
        notes: Schema.Types.Mixed,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

export const Payment = model("Payment", paymentSchema);
