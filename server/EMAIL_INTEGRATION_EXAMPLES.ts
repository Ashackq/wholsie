/**
 * EMAIL INTEGRATION EXAMPLES
 * 
 * Copy-paste these examples into your route handlers to send emails.
 * All examples use the orderEmail utility functions.
 */

// ============================================================================
// EXAMPLE 1: ORDER CONFIRMATION EMAIL
// ============================================================================
// Add to your order creation route

import { sendOrderConfirmationEmail } from "@/utils/orderEmail";

export async function handleOrderCreation(req: any, res: any) {
    try {
        // ... existing order creation logic ...
        const order = await Order.create(orderData);

        // Prepare invoice data for email
        const invoiceData = {
            orderId: order.orderId,
            orderDate: order.createdAt,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            shippingAddress: {
                street: order.shippingAddress?.street,
                city: order.shippingAddress?.city,
                state: order.shippingAddress?.state,
                postalCode: order.shippingAddress?.postalCode,
                country: order.shippingAddress?.country,
            },
            items: order.items.map((item: any) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                amount: item.quantity * item.price,
            })),
            subtotal: order.subtotal,
            tax: order.tax,
            shippingCost: order.shippingCost,
            discount: order.discount,
            total: order.total,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            storeName: "Wholesiii",
            storeEmail: "noreply@wholesiii.com",
        };

        // Send email (non-blocking)
        sendOrderConfirmationEmail(invoiceData).catch((err) => {
            console.error("Failed to send order confirmation email:", err);
            // Can log to database or notify admin
        });

        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ error: "Failed to create order" });
    }
}

// ============================================================================
// EXAMPLE 2: INVOICE EMAIL (AFTER PAYMENT CONFIRMATION)
// ============================================================================
// Add to your payment confirmation route

import { sendInvoiceEmail } from "@/utils/orderEmail";

export async function handlePaymentSuccess(req: any, res: any) {
    try {
        const order = await Order.findOne({ razorpayOrderId: req.body.razorpayOrderId });

        // Mark payment as completed
        order.paymentStatus = "completed";
        await order.save();

        // Send invoice email
        const invoiceData = {
            orderId: order.orderId,
            orderDate: order.createdAt,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            items: order.items,
            subtotal: order.subtotal,
            tax: order.tax,
            shippingCost: order.shippingCost,
            discount: order.discount,
            total: order.total,
            paymentMethod: order.paymentMethod,
            paymentStatus: "Completed",
            shippingAddress: order.shippingAddress,
            storeName: "Wholesiii",
            storeEmail: "noreply@wholesiii.com",
        };

        await sendInvoiceEmail(invoiceData);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Payment confirmation failed" });
    }
}

// ============================================================================
// EXAMPLE 3: SHIPMENT TRACKING EMAIL
// ============================================================================
// Add when updating order status to "shipped"

import { sendShipmentEmail } from "@/utils/orderEmail";

export async function handleOrderShipped(req: any, res: any) {
    try {
        const { orderId, trackingNumber, estimatedDelivery } = req.body;
        const order = await Order.findOne({ orderId });

        // Update order with tracking info
        order.status = "shipped";
        order.delhiveryTrackingId = trackingNumber;
        order.delhiveryPickupScheduled = new Date();
        await order.save();

        // Send shipment email
        const success = await sendShipmentEmail(
            order.customerEmail,
            orderId,
            trackingNumber,
            estimatedDelivery, // e.g., "2025-01-15"
        );

        res.json({ success, message: "Order shipped notification sent" });
    } catch (error) {
        res.status(500).json({ error: "Failed to mark order as shipped" });
    }
}

// ============================================================================
// EXAMPLE 4: PASSWORD RESET EMAIL
// ============================================================================
// Add to forgot password route

import { sendPasswordResetEmail } from "@/utils/orderEmail";
import jwt from "jsonwebtoken";

export async function handleForgotPassword(req: any, res: any) {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Generate reset token (expires in 30 minutes)
        const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30m",
        });

        // Save reset token to database
        user.passwordResetToken = resetToken;
        user.passwordResetExpiry = Date.now() + 30 * 60 * 1000;
        await user.save();

        // Create reset link
        const resetLink = `${process.env.CLIENT_ORIGIN}/reset-password?token=${resetToken}`;

        // Send email
        const success = await sendPasswordResetEmail(email, resetLink, 30);

        res.json({
            success,
            message: "Password reset link sent to email",
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to process password reset" });
    }
}

// ============================================================================
// EXAMPLE 5: OTP VERIFICATION EMAIL
// ============================================================================
// Add to OTP verification route

import { sendOTPEmail } from "@/utils/orderEmail";

export async function handleSendOTP(req: any, res: any) {
    try {
        const { email } = req.body;

        // Generate 6-digit OTP
        const otp = Math.random().toString().slice(2, 8);

        // Save OTP to database with expiry (10 minutes)
        const otpRecord = await OTPModel.create({
            email,
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000,
        });

        // Send OTP email
        const success = await sendOTPEmail(email, otp, 10);

        res.json({
            success,
            message: "OTP sent to email",
            otpId: otpRecord._id, // For verification
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to send OTP" });
    }
}

// ============================================================================
// EXAMPLE 6: WELCOME EMAIL (NEW USER REGISTRATION)
// ============================================================================
// Add to user registration route

import { sendWelcomeEmail } from "@/utils/orderEmail";

export async function handleUserRegistration(req: any, res: any) {
    try {
        const { name, email, password } = req.body;

        // Create user
        const user = await User.create({
            name,
            email,
            password: await hashPassword(password),
        });

        // Send welcome email
        const success = await sendWelcomeEmail(email, name);

        res.json({
            success: true,
            message: "User registered successfully",
            user,
            emailSent: success,
        });
    } catch (error) {
        res.status(500).json({ error: "Registration failed" });
    }
}

// ============================================================================
// EXAMPLE 7: CUSTOM TEMPLATE EMAIL (DATABASE-BACKED)
// ============================================================================
// Use for complex emails with dynamic content

import { sendEmailUsingTemplate } from "@/utils/orderEmail";

export async function handleTemplateEmail(req: any, res: any) {
    try {
        const success = await sendEmailUsingTemplate(
            "order_confirmation", // templateId from DB
            "customer@example.com",
            {
                // Replacements - {key} in template becomes value
                orderId: "ORD_12345",
                customerName: "John Doe",
                orderTotal: "1280",
                estimatedDelivery: "2025-01-15",
                trackingNumber: "DL12345678",
                // ... add all placeholders your template uses
            },
        );

        res.json({ success, message: "Template email sent" });
    } catch (error) {
        res.status(500).json({ error: "Failed to send template email" });
    }
}

// ============================================================================
// EXAMPLE 8: ORDER STATUS UPDATE EMAIL
// ============================================================================
// Send different emails based on order status

import { sendEmail } from "@/utils/email";

export async function handleOrderStatusUpdate(req: any, res: any) {
    try {
        const { orderId, newStatus } = req.body;
        const order = await Order.findOne({ orderId });

        let emailSubject = "";
        let emailHtml = "";

        switch (newStatus) {
            case "confirmed":
                emailSubject = "Order Confirmed";
                emailHtml = `<h1>Your order is confirmed!</h1><p>Order #${orderId}</p>`;
                break;
            case "processing":
                emailSubject = "Order Processing";
                emailHtml = `<h1>We're processing your order</h1><p>Order #${orderId}</p>`;
                break;
            case "shipped":
                emailSubject = "Order Shipped";
                emailHtml = `<h1>Your order has shipped!</h1><p>Tracking: ${order.delhiveryTrackingId}</p>`;
                break;
            case "delivered":
                emailSubject = "Order Delivered";
                emailHtml = `<h1>Your order has been delivered!</h1><p>Thank you for shopping!</p>`;
                break;
            case "cancelled":
                emailSubject = "Order Cancelled";
                emailHtml = `<h1>Your order has been cancelled</h1><p>Refund will be processed in 5-7 days.</p>`;
                break;
        }

        // Send email
        const success = await sendEmail({
            to: order.customerEmail,
            subject: emailSubject,
            html: emailHtml,
        });

        // Update order status
        order.status = newStatus;
        await order.save();

        res.json({ success, message: `Order status updated to ${newStatus}` });
    } catch (error) {
        res.status(500).json({ error: "Failed to update order status" });
    }
}

// ============================================================================
// EXAMPLE 9: BULK EMAIL TO MULTIPLE RECIPIENTS
// ============================================================================

import { sendEmail } from "@/utils/email";

export async function handleNewsletterEmail(req: any, res: any) {
    try {
        const { subject, html } = req.body;

        // Get all subscribed users
        const subscribers = await User.find({ emailSubscribed: true });

        let successCount = 0;
        let failCount = 0;

        // Send email to each subscriber
        for (const subscriber of subscribers) {
            const success = await sendEmail({
                to: subscriber.email,
                subject,
                html,
            });

            if (success) successCount++;
            else failCount++;
        }

        res.json({
            success: true,
            sent: successCount,
            failed: failCount,
            total: subscribers.length,
        });
    } catch (error) {
        res.status(500).json({ error: "Newsletter send failed" });
    }
}

// ============================================================================
// EXAMPLE 10: ERROR HANDLING & LOGGING
// ============================================================================

export async function handleEmailWithErrorLogging(req: any, res: any) {
    try {
        const { email, subject, content } = req.body;

        const success = await sendEmail({
            to: email,
            subject,
            html: content,
        });

        if (!success) {
            // Log to database for tracking
            await EmailLog.create({
                email,
                subject,
                status: "failed",
                timestamp: new Date(),
            });

            // Notify admin
            console.error(`Failed to send email to ${email}`);
        } else {
            // Log successful send
            await EmailLog.create({
                email,
                subject,
                status: "sent",
                timestamp: new Date(),
            });
        }

        res.json({
            success,
            message: success ? "Email sent" : "Email failed",
        });
    } catch (error) {
        // Log unexpected errors
        console.error("Email handler error:", error);
        res.status(500).json({ error: "Email service error" });
    }
}

// ============================================================================
// HELPER: EMAIL LOG MODEL (optional - for tracking)
// ============================================================================

import { Schema, model } from "mongoose";

const emailLogSchema = new Schema(
    {
        email: String,
        subject: String,
        status: { type: String, enum: ["sent", "failed", "bounced"] },
        errorMessage: String,
        timestamp: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

export const EmailLog = model("EmailLog", emailLogSchema);

// ============================================================================
// HELPER: CREATE EMAIL TEMPLATES IN DATABASE
// ============================================================================

import { EmailTemplate } from "@/models/EmailTemplate";

export async function createEmailTemplates() {
    // Create order confirmation template
    await EmailTemplate.create({
        templateId: "order_confirmation",
        name: "Order Confirmation",
        subject: "Your Order {orderId} is Confirmed!",
        message: `
            <h1>Order Confirmed</h1>
            <p>Hi {customerName},</p>
            <p>Thank you for your order {orderId}</p>
            <p><strong>Total:</strong> {orderTotal}</p>
        `,
        placeholders: ["orderId", "customerName", "orderTotal"],
        type: "order_confirmation",
        isActive: true,
    });

    // Create password reset template
    await EmailTemplate.create({
        templateId: "password_reset",
        name: "Password Reset",
        subject: "Reset Your Password",
        message: `
            <h1>Password Reset</h1>
            <p>Click here to reset: {resetLink}</p>
            <p>Expires in: {expiryMinutes} minutes</p>
        `,
        placeholders: ["resetLink", "expiryMinutes"],
        type: "password_reset",
        isActive: true,
    });
}

export default {
    handleOrderCreation,
    handlePaymentSuccess,
    handleOrderShipped,
    handleForgotPassword,
    handleSendOTP,
    handleUserRegistration,
    handleTemplateEmail,
    handleOrderStatusUpdate,
    handleNewsletterEmail,
    handleEmailWithErrorLogging,
};
