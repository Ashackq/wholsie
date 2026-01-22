import { Router } from "express";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { sendOrderConfirmation, sendShippingNotification } from "../utils/sms.js";
import { sendOrderUpdate } from "../utils/aisensy.js";

const createOrderSchema = z.object({
    items: z.array(
        z.object({
            productId: z.string(),
            quantity: z.number().positive(),
            price: z.number().positive(),
            name: z.string(),
        }),
    ),
    shippingAddress: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
        country: z.string().default("India"),
    }),
    total: z.number().positive(),
    subtotal: z.number().positive(),
    tax: z.number().nonnegative().default(0),
    shippingCost: z.number().nonnegative().default(0),
    discount: z.number().nonnegative().default(0),
});

export const ordersRouter = Router();

// Create order (after payment)
ordersRouter.post("/orders", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const { User } = await import("../models/User.js");
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const orderId = `ORD_${Date.now()}_${userId.toString().slice(-6)}`;
        const order = new Order({
            orderId,
            userId,
            items: parsed.data.items,
            shippingAddress: parsed.data.shippingAddress,
            status: "pending",
            paymentStatus: "pending",
            subtotal: parsed.data.subtotal,
            tax: parsed.data.tax,
            shippingCost: parsed.data.shippingCost,
            discount: parsed.data.discount,
            total: parsed.data.total,
        });

        await order.save();

        // Send confirmation SMS
        if (user.phone) {
            await sendOrderConfirmation(user.phone, orderId);
        }

        return res.status(201).json({ data: order });
    } catch (err) {
        return next(err);
    }
});

// Get user's orders
ordersRouter.get("/orders", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const orders = await Order.find({ userId }).sort({ createdAt: -1 });
        return res.json({ data: orders });
    } catch (err) {
        return next(err);
    }
});

// Get order by ID
ordersRouter.get("/orders/:orderId", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate("items.productId");

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Verify ownership
        if (order.userId.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Forbidden" });
        }

        return res.json({ data: order });
    } catch (err) {
        return next(err);
    }
});

// Update order status (admin only)
ordersRouter.patch("/orders/:orderId", async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    try {
        const { orderId } = req.params;
        const { status, delhiveryTrackingId, aisensynumber } = req.body;

        const order = await Order.findByIdAndUpdate(
            orderId,
            {
                ...(status && { status }),
                ...(delhiveryTrackingId && { delhiveryTrackingId }),
                ...(aisensynumber && { aisensynumber }),
            },
            { new: true },
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Send update notifications
        const { User } = await import("../models/User.js");
        const user = await User.findById(order.userId);

        if (status === "shipped" && user?.phone) {
            await sendShippingNotification(user.phone, order.orderId, delhiveryTrackingId || "");
        }

        return res.json({ data: order });
    } catch (err) {
        return next(err);
    }
});

// Cancel order (customer or admin)
ordersRouter.post("/orders/:orderId/cancel", async (req, res, next) => {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Verify ownership (customer) or admin
        if (order.userId.toString() !== userId.toString() && userRole !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }

        // Check if order can be cancelled
        const cancellableStatuses = ["pending", "confirmed", "processing"];
        if (!cancellableStatuses.includes(order.status)) {
            return res.status(400).json({
                error: `Cannot cancel order with status '${order.status}'. Orders can only be cancelled if they are pending, confirmed, or still processing.`
            });
        }

        // If order has a Delhivery tracking ID, attempt to cancel the shipment
        if (order.delhiveryTrackingId) {
            try {
                const { cancelShipment } = await import("../utils/delhivery.js");
                await cancelShipment(order.delhiveryTrackingId);
            } catch (err) {
                // Log but don't fail the cancel if Delhivery cancellation fails
                console.error("Failed to cancel Delhivery shipment:", err);
            }
        }

        // Update order status to cancelled
        order.status = "cancelled";
        await order.save();

        return res.json({ data: order, message: "Order cancelled successfully" });
    } catch (err) {
        return next(err);
    }
});

// Delete order (admin only - permanently delete from DB)
ordersRouter.delete("/orders/:orderId", async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    try {
        const { orderId } = req.params;
        const order = await Order.findByIdAndDelete(orderId);

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        return res.json({ data: order, message: "Order deleted successfully" });
    } catch (err) {
        return next(err);
    }
});

// Cancel order (customer or admin)
ordersRouter.post("/orders/:orderId/cancel", async (req, res, next) => {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Verify ownership (customer) or admin
        if (order.userId.toString() !== userId.toString() && userRole !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }

        // Check if order can be cancelled
        const cancellableStatuses = ["pending", "confirmed", "processing"];
        if (!cancellableStatuses.includes(order.status)) {
            return res.status(400).json({
                error: `Cannot cancel order with status '${order.status}'. Orders can only be cancelled if they are pending, confirmed, or still processing.`
            });
        }

        // If order has a Delhivery tracking ID, attempt to cancel the shipment
        if (order.delhiveryTrackingId) {
            try {
                const { cancelShipment } = await import("../utils/delhivery.js");
                await cancelShipment(order.delhiveryTrackingId);
            } catch (err) {
                // Log but don't fail the cancel if Delhivery cancellation fails
                console.error("Failed to cancel Delhivery shipment:", err);
            }
        }

        // Update order status to cancelled
        order.status = "cancelled";
        await order.save();

        return res.json({ data: order, message: "Order cancelled successfully" });
    } catch (err) {
        return next(err);
    }
});
