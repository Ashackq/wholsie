import { Schema, model } from "mongoose";

const supportTicketSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        orderId: { type: Schema.Types.ObjectId, ref: "Order" },
        subject: { type: String, required: true },
        description: { type: String, required: true },
        category: {
            type: String,
            enum: ["order", "payment", "delivery", "product", "return", "other"],
            required: true,
        },
        priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
        status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open" },
        attachments: [{ type: String }],
        messages: [
            {
                sender: { type: Schema.Types.ObjectId, ref: "User" },
                message: { type: String },
                attachments: [{ type: String }],
                createdAt: { type: Date, default: Date.now },
            },
        ],
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        closedAt: { type: Date },
    },
    { timestamps: true }
);

export const SupportTicket = model("SupportTicket", supportTicketSchema);
