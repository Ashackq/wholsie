/**
 * EMAIL TEMPLATES - IMPLEMENTATION EXAMPLES
 *
 * Copy-paste these examples into your route handlers to use the new email templates
 * for Order Confirmation, Shipment, and Cancellation
 */

// ============================================================================
// EXAMPLE 1: ORDER CONFIRMATION EMAIL WITH INVOICE
// ============================================================================
// Add this to your order creation route (POST /api/orders)

import { sendEmail } from "@/utils/email";
import { generateOrderConfirmationInvoiceTemplate } from "@/utils/emailTemplates";
import { Order } from "@/models/Order";

export async function handleOrderCreationWithTemplate(req: any, res: any) {
    try {
        // ... your order creation logic ...
        const order = await Order.create(orderData);

        // Prepare data for email template
        const emailData = {
            orderId: order.orderId,
            orderDate: new Date(order.createdAt),
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            shippingAddress: {
                street: order.shippingAddress?.street,
                city: order.shippingAddress?.city,
                state: order.shippingAddress?.state,
                postalCode: order.shippingAddress?.postalCode,
                country: order.shippingAddress?.country || "India",
            },
            items: order.items.map((item: any) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                amount: item.price * item.quantity,
            })),
            subtotal: order.subtotal,
            tax: order.tax,
            shippingCost: order.shippingCost,
            discount: order.discount || 0,
            total: order.total,
            paymentMethod: order.paymentMethod || "Online Payment",
            paymentStatus: "Confirmed",
            storeName: "Wholesiii",
            storeEmail: "support@wholesiii.com",
            storePhone: "+91-9999999999",
            storeAddress: "123 Business Street, Bangalore",
        };

        // Generate HTML using template
        const htmlContent = generateOrderConfirmationInvoiceTemplate(emailData);

        // Send email
        const success = await sendEmail({
            to: order.customerEmail,
            subject: `Order Confirmation - ${order.orderId}`,
            html: htmlContent,
        });

        // Log result
        console.log(`Order confirmation email sent: ${success}`);

        res.json({
            success: true,
            order,
            emailSent: success,
        });
    } catch (error) {
        console.error("Order creation error:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
}

// ============================================================================
// EXAMPLE 2: ORDER SHIPPED EMAIL
// ============================================================================
// Add this to your shipment tracking route (POST /api/orders/:orderId/ship)

import { generateOrderShippedTemplate } from "@/utils/emailTemplates";

export async function handleOrderShipment(req: any, res: any) {
    try {
        const { orderId } = req.params;
        const { trackingNumber, estimatedDelivery, courierName } = req.body;

        // Get order from database
        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Update order with tracking info
        order.status = "shipped";
        order.trackingNumber = trackingNumber;
        order.delhiveryTrackingId = trackingNumber; // if using Delhivery
        order.estimatedDelivery = estimatedDelivery
            ? new Date(estimatedDelivery)
            : null;
        await order.save();

        // Prepare data for email template
        const emailData = {
            orderId: order.orderId,
            customerName: order.customerName,
            trackingNumber: trackingNumber,
            courierName: courierName || "Delhivery",
            estimatedDelivery: estimatedDelivery,
            storeName: "Wholesiii",
            storePhone: "+91-9999999999",
        };

        // Generate HTML using template
        const htmlContent = generateOrderShippedTemplate(emailData);

        // Send email
        const success = await sendEmail({
            to: order.customerEmail,
            subject: `Your Order ${orderId} is Shipped! - Tracking: ${trackingNumber}`,
            html: htmlContent,
        });

        console.log(`Shipment email sent: ${success}`);

        res.json({
            success: true,
            message: "Order marked as shipped and customer notified",
            order,
            emailSent: success,
        });
    } catch (error) {
        console.error("Shipment error:", error);
        res.status(500).json({ error: "Failed to ship order" });
    }
}

// ============================================================================
// EXAMPLE 3: ORDER CANCELLED EMAIL WITH REFUND INFO
// ============================================================================
// Add this to your order cancellation route (POST /api/orders/:orderId/cancel)

import { generateOrderCancelledTemplate } from "@/utils/emailTemplates";

export async function handleOrderCancellation(req: any, res: any) {
    try {
        const { orderId } = req.params;
        const { reason, refundMethod, refundTimeline } = req.body;

        // Get order from database
        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Check if order can be cancelled
        if (["delivered", "cancelled"].includes(order.status)) {
            return res.status(400).json({
                error: `Cannot cancel order with status: ${order.status}`,
            });
        }

        // Calculate refund amount (full refund)
        const refundAmount = order.total;

        // Update order status
        order.status = "cancelled";
        order.cancellationReason = reason;
        order.cancelledAt = new Date();
        await order.save();

        // Process refund in payment gateway (if payment was completed)
        // try {
        //     await razorpay.refunds.create({
        //         payment_id: order.razorpayPaymentId,
        //         amount: refundAmount * 100, // Razorpay expects amount in paise
        //     });
        // } catch (error) {
        //     console.error("Refund processing error:", error);
        // }

        // Prepare data for email template
        const emailData = {
            orderId: order.orderId,
            customerName: order.customerName,
            cancellationReason:
                reason ||
                "Your cancellation request has been processed",
            refundAmount: refundAmount,
            refundMethod: refundMethod || "Original Payment Method",
            refundTimeline: refundTimeline || "5-7 business days",
            storeName: "Wholesiii",
            storeEmail: "support@wholesiii.com",
            storePhone: "+91-9999999999",
        };

        // Generate HTML using template
        const htmlContent = generateOrderCancelledTemplate(emailData);

        // Send email
        const success = await sendEmail({
            to: order.customerEmail,
            subject: `Order Cancellation Confirmed - ${orderId}`,
            html: htmlContent,
        });

        console.log(`Cancellation email sent: ${success}`);

        res.json({
            success: true,
            message: "Order cancelled successfully",
            refundAmount,
            refundTimeline: refundTimeline || "5-7 business days",
            emailSent: success,
        });
    } catch (error) {
        console.error("Cancellation error:", error);
        res.status(500).json({ error: "Failed to cancel order" });
    }
}

// ============================================================================
// EXAMPLE 4: COMPLETE ORDER ROUTES WITH ALL EMAIL TEMPLATES
// ============================================================================
// Copy this entire block into your routes file

import express from "express";
import {
    generateOrderConfirmationInvoiceTemplate,
    generateOrderShippedTemplate,
    generateOrderCancelledTemplate,
} from "@/utils/emailTemplates";

export const orderRoutes = express.Router();

/**
 * POST /api/orders
 * Create new order and send confirmation email
 */
orderRoutes.post("/", async (req, res) => {
    try {
        const orderData = req.body;

        // Validate input
        if (!orderData.customerEmail) {
            return res
                .status(400)
                .json({ error: "Customer email is required" });
        }

        // Create order (pseudo-code)
        const order = await Order.create({
            ...orderData,
            orderId: `ORD_${Date.now()}`,
            status: "pending",
        });

        // Send confirmation email
        const emailData = {
            orderId: order.orderId,
            orderDate: new Date(order.createdAt),
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            shippingAddress: order.shippingAddress,
            items: order.items,
            subtotal: order.subtotal,
            tax: order.tax,
            shippingCost: order.shippingCost,
            discount: order.discount || 0,
            total: order.total,
            paymentMethod: "Online Payment",
            paymentStatus: "Confirmed",
            storeName: "Wholesiii",
            storeEmail: "support@wholesiii.com",
            storePhone: "+91-9999999999",
        };

        const html = generateOrderConfirmationInvoiceTemplate(emailData);
        const emailSent = await sendEmail({
            to: order.customerEmail,
            subject: `Order Confirmation - ${order.orderId}`,
            html,
        });

        res.status(201).json({
            success: true,
            order,
            emailSent,
        });
    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
});

/**
 * POST /api/orders/:orderId/ship
 * Mark order as shipped and send tracking email
 */
orderRoutes.post("/:orderId/ship", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { trackingNumber, estimatedDelivery } = req.body;

        // Validate input
        if (!trackingNumber) {
            return res
                .status(400)
                .json({ error: "Tracking number is required" });
        }

        // Find and update order
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        order.status = "shipped";
        order.trackingNumber = trackingNumber;
        order.estimatedDelivery = estimatedDelivery
            ? new Date(estimatedDelivery)
            : null;
        await order.save();

        // Send shipment email
        const emailData = {
            orderId: order.orderId,
            customerName: order.customerName,
            trackingNumber,
            courierName: "Delhivery",
            estimatedDelivery,
            storeName: "Wholesiii",
            storePhone: "+91-9999999999",
        };

        const html = generateOrderShippedTemplate(emailData);
        const emailSent = await sendEmail({
            to: order.customerEmail,
            subject: `Your Order ${orderId} is Shipped!`,
            html,
        });

        res.json({
            success: true,
            message: "Order shipped successfully",
            emailSent,
        });
    } catch (error) {
        console.error("Ship order error:", error);
        res.status(500).json({ error: "Failed to ship order" });
    }
});

/**
 * POST /api/orders/:orderId/cancel
 * Cancel order and send cancellation email with refund info
 */
orderRoutes.post("/:orderId/cancel", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        // Find order
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Check if order can be cancelled
        if (["delivered", "cancelled"].includes(order.status)) {
            return res.status(400).json({
                error: `Cannot cancel order with status: ${order.status}`,
            });
        }

        // Update order
        order.status = "cancelled";
        order.cancellationReason = reason || "Customer Request";
        order.cancelledAt = new Date();
        await order.save();

        // Send cancellation email
        const emailData = {
            orderId: order.orderId,
            customerName: order.customerName,
            cancellationReason: reason || "Your cancellation request",
            refundAmount: order.total,
            refundMethod: "Original Payment Method",
            refundTimeline: "5-7 business days",
            storeName: "Wholesiii",
            storeEmail: "support@wholesiii.com",
            storePhone: "+91-9999999999",
        };

        const html = generateOrderCancelledTemplate(emailData);
        const emailSent = await sendEmail({
            to: order.customerEmail,
            subject: `Order Cancellation Confirmed - ${orderId}`,
            html,
        });

        res.json({
            success: true,
            message: "Order cancelled successfully",
            refundAmount: order.total,
            refundTimeline: "5-7 business days",
            emailSent,
        });
    } catch (error) {
        console.error("Cancel order error:", error);
        res.status(500).json({ error: "Failed to cancel order" });
    }
});

/**
 * GET /api/orders/:orderId
 * Get order details
 */
orderRoutes.get("/:orderId", async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch order" });
    }
});

// ============================================================================
// EXAMPLE 5: MANUAL EMAIL RESEND HELPER
// ============================================================================
// Useful for resending emails if they fail

export async function resendOrderEmail(
    orderId: string,
    emailType: "confirmation" | "shipped" | "cancelled",
) {
    try {
        const order = await Order.findOne({ orderId });
        if (!order) {
            throw new Error("Order not found");
        }

        let htmlContent = "";
        let subject = "";

        switch (emailType) {
            case "confirmation":
                htmlContent = generateOrderConfirmationInvoiceTemplate({
                    orderId: order.orderId,
                    orderDate: new Date(order.createdAt),
                    customerName: order.customerName,
                    customerEmail: order.customerEmail,
                    customerPhone: order.customerPhone,
                    shippingAddress: order.shippingAddress,
                    items: order.items,
                    subtotal: order.subtotal,
                    tax: order.tax,
                    shippingCost: order.shippingCost,
                    discount: order.discount || 0,
                    total: order.total,
                    paymentMethod: "Online Payment",
                    paymentStatus: "Confirmed",
                    storeName: "Wholesiii",
                    storeEmail: "support@wholesiii.com",
                });
                subject = `Order Confirmation - ${orderId}`;
                break;

            case "shipped":
                htmlContent = generateOrderShippedTemplate({
                    orderId: order.orderId,
                    customerName: order.customerName,
                    trackingNumber: order.trackingNumber || "PENDING",
                    courierName: "Delhivery",
                    estimatedDelivery: order.estimatedDelivery?.toISOString(),
                    storeName: "Wholesiii",
                });
                subject = `Your Order ${orderId} is Shipped!`;
                break;

            case "cancelled":
                htmlContent = generateOrderCancelledTemplate({
                    orderId: order.orderId,
                    customerName: order.customerName,
                    cancellationReason: order.cancellationReason,
                    refundAmount: order.total,
                    refundMethod: "Original Payment Method",
                    refundTimeline: "5-7 business days",
                    storeName: "Wholesiii",
                    storeEmail: "support@wholesiii.com",
                });
                subject = `Order Cancellation Confirmed - ${orderId}`;
                break;
        }

        const success = await sendEmail({
            to: order.customerEmail,
            subject,
            html: htmlContent,
        });

        return { success, message: `${emailType} email resent` };
    } catch (error) {
        console.error("Error resending email:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

// ============================================================================
// EXAMPLE 6: API ENDPOINT FOR RESENDING EMAILS
// ============================================================================
// Add this route if you need admin functionality to resend emails

/**
 * POST /api/orders/:orderId/resend-email?type=confirmation|shipped|cancelled
 * Resend email for an order
 */
orderRoutes.post("/:orderId/resend-email", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { type } = req.query as { type: string };

        if (!["confirmation", "shipped", "cancelled"].includes(type)) {
            return res
                .status(400)
                .json({ error: "Invalid email type" });
        }

        const result = await resendOrderEmail(
            orderId,
            type as "confirmation" | "shipped" | "cancelled",
        );

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            error: "Failed to resend email",
        });
    }
});
