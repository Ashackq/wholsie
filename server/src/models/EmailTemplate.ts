import { Schema, model } from "mongoose";

const emailTemplateSchema = new Schema(
    {
        // Template identifier (e.g., "order_confirmation", "password_reset", "invoice")
        templateId: { type: String, unique: true, required: true },

        // Human-readable name
        name: { type: String, required: true },

        // Email subject with optional placeholders like {orderNumber}, {customerName}
        subject: { type: String, required: true },

        // HTML template content with placeholders like {orderNumber}, {customerName}, etc.
        message: { type: String, required: true },

        // Description of available placeholders for reference
        placeholders: { type: [String], default: [] },

        // Whether this template is active
        isActive: { type: Boolean, default: true },

        // Template type for categorization
        type: {
            type: String,
            enum: ["order_confirmation", "password_reset", "otp_verification", "invoice", "shipment_tracking", "custom"],
            required: true,
        },
    },
    { timestamps: true },
);

export const EmailTemplate = model("EmailTemplate", emailTemplateSchema);
