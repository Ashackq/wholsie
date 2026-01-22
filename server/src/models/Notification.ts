import { Schema, model } from "mongoose";

const notificationSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: {
            type: String,
            enum: ["order", "promotion", "system", "review", "support"],
            default: "system",
        },
        title: { type: String, required: true },
        message: { type: String, required: true },
        data: { type: Schema.Types.Mixed }, // Can store orderId, productId, etc.
        isRead: { type: Boolean, default: false },
        readAt: { type: Date },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date }, // Optional expiration
    },
    { timestamps: true }
);

// Auto-delete notifications after expiresAt date
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = model("Notification", notificationSchema);
