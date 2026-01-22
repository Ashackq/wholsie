import { Schema, model } from "mongoose";

const walletSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        balance: { type: Number, default: 0, min: 0 },
        totalEarned: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        transactions: [
            {
                type: { type: String, enum: ["credit", "debit"] },
                amount: { type: Number },
                description: { type: String },
                orderId: { type: Schema.Types.ObjectId, ref: "Order" },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const Wallet = model("Wallet", walletSchema);
