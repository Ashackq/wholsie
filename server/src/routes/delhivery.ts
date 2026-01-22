import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
    checkPincodeServiceability,
    createShipment,
    getTrackingStatus,
    cancelShipment,
    getPickupLocations,
    fetchWaybills,
    getEstimatedTAT,
    createWarehouse,
    updateWarehouse,
    calculateShippingCost,
    updateShipment,
    createPickupRequest,
    generateShippingLabel,
    downloadDocument,
} from "../utils/delhivery.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";

export const delhiveryRouter = Router();

// Check pincode serviceability (public endpoint - used during checkout)
const pincodeSchema = z.object({
    pincode: z.string().regex(/^\d{6}$/, "Invalid pincode format"),
});

delhiveryRouter.post("/delhivery/check-pincode", async (req, res, next) => {
    const parsed = pincodeSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const result = await checkPincodeServiceability(parsed.data.pincode);
        return res.json({ data: result });
    } catch (err) {
        return next(err);
    }
});

// Get tracking information for an order (authenticated users)
delhiveryRouter.get("/delhivery/track/:waybill", requireAuth, async (req, res, next) => {
    try {
        const { waybill } = req.params;
        if (!waybill) {
            return res.status(400).json({ error: "Waybill number is required" });
        }

        const trackingData = await getTrackingStatus(waybill);
        return res.json({ data: trackingData });
    } catch (err) {
        return next(err);
    }
});

// Get tracking information by order ID (authenticated users)
delhiveryRouter.get("/delhivery/track-order/:orderId", requireAuth, async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Verify ownership or admin
        const userRole = (req as any).userRole;
        if (order.userId.toString() !== userId.toString() && userRole !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }

        if (!order.delhiveryTrackingId) {
            return res.status(400).json({ error: "Order does not have tracking information yet" });
        }

        const trackingData = await getTrackingStatus(order.delhiveryTrackingId);
        return res.json({ data: trackingData, order: { orderId: order.orderId, status: order.status } });
    } catch (err) {
        return next(err);
    }
});

// Admin: Create shipment for an order
const createShipmentSchema = z.object({
    orderId: z.string(),
    pickupLocation: z.string().optional(),
    weight: z.string().optional(),
    dimensions: z
        .object({
            length: z.string(),
            width: z.string(),
            height: z.string(),
        })
        .optional(),
    productsDescription: z.string().optional(),
});

delhiveryRouter.post("/delhivery/create-shipment", requireAuth, async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    const parsed = createShipmentSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const { orderId, pickupLocation, weight, dimensions, productsDescription } = parsed.data;

        // Get default pickup location from settings if not provided
        let finalPickupLocation = pickupLocation;
        if (!finalPickupLocation) {
            const { getSetting } = await import("../models/Settings.js");
            finalPickupLocation = await getSetting("defaultPickupLocation", "Primary");
        }

        // Get order details - try by orderId, orderNo, or _id
        let order = await Order.findOne({ orderId }).populate("userId");
        if (!order) {
            order = await Order.findOne({ orderNo: orderId }).populate("userId");
        }
        if (!order) {
            order = await Order.findById(orderId).populate("userId");
        }
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.delhiveryTrackingId) {
            return res.status(400).json({ error: "Shipment already created for this order" });
        }

        // Get user details
        const user = await User.findById(order.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Validate required order fields
        if (!order.shippingAddress) {
            return res.status(400).json({ error: "Shipping address is required" });
        }

        // Calculate total quantity and prepare product description
        const totalQuantity = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const productDesc =
            productsDescription ||
            order.items.map((item) => `${item.name} (${item.quantity})`).join(", ");

        // Get user name from firstName and lastName
        const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "Customer";

        // Validate pickup location
        if (!finalPickupLocation) {
            return res.status(400).json({
                error: "Pickup location is required. Please set a default pickup location in Settings or provide one in the request."
            });
        }

        // Prepare shipment data
        const shipmentData = {
            shipments: [
                {
                    name: userName,
                    add: order.shippingAddress.street || "",
                    pin: order.shippingAddress.postalCode || "",
                    city: order.shippingAddress.city || "",
                    state: order.shippingAddress.state || "",
                    country: order.shippingAddress.country || "India",
                    phone: user.phone || "9999999999",
                    order: orderId,
                    payment_mode: order.paymentStatus === "completed" ? ("Prepaid" as const) : ("COD" as const),
                    products_desc: productDesc,
                    cod_amount: order.paymentStatus === "completed" ? "0" : (order.total || 0).toString(),
                    order_date: order.createdAt.toISOString().split("T")[0],
                    total_amount: (order.total || 0).toString(),
                    quantity: totalQuantity.toString(),
                    weight: weight || "500", // Default 500g
                    shipment_width: dimensions?.width,
                    shipment_height: dimensions?.height,
                    shipment_length: dimensions?.length,
                    shipping_mode: "Surface",
                },
            ],
            pickup_location: {
                name: finalPickupLocation,
            },
            pickup_time: "1000-1800",
        };

        const result = await createShipment(shipmentData);

        console.log("Delhivery API response:", JSON.stringify(result, null, 2));

        if (result.success && result.waybill) {
            // Update order with tracking ID
            order.delhiveryTrackingId = result.waybill;
            order.status = "processing";
            await order.save();

            return res.json({
                data: {
                    success: true,
                    waybill: result.waybill,
                    orderId: order.orderId,
                    message: "Shipment created successfully",
                },
            });
        } else {
            console.error("Delhivery shipment creation failed:", result);
            return res.status(400).json({
                error: result.error || "Failed to create shipment",
                details: result.rmk || result,
                success: result.success,
            });
        }
    } catch (err) {
        return next(err);
    }
});

// Admin: Cancel shipment
delhiveryRouter.post("/delhivery/cancel-shipment", requireAuth, async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    const { waybill } = req.body;
    if (!waybill) {
        return res.status(400).json({ error: "Waybill number is required" });
    }

    try {
        const result = await cancelShipment(waybill);

        // Update order status
        const order = await Order.findOne({ delhiveryTrackingId: waybill });
        if (order) {
            order.status = "cancelled";
            await order.save();
        }

        return res.json({ data: result });
    } catch (err) {
        return next(err);
    }
});

// Admin: Get pickup locations
delhiveryRouter.get("/delhivery/pickup-locations", requireAuth, async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    try {
        const locations = await getPickupLocations();
        return res.json({ data: locations });
    } catch (err) {
        return next(err);
    }
});

// Webhook endpoint for Delhivery status updates
delhiveryRouter.post("/delhivery/webhook", async (req, res, next) => {
    try {
        // Delhivery sends status updates to this endpoint
        const { waybill, status, status_code } = req.body;

        if (!waybill) {
            return res.status(400).json({ error: "Waybill is required" });
        }

        // Find and update order
        const order = await Order.findOne({ delhiveryTrackingId: waybill });
        if (order) {
            // Map Delhivery status to our order status
            let orderStatus = order.status;
            if (status_code === "UD" || status === "Delivered") {
                orderStatus = "delivered";
            } else if (status_code === "RP" || status === "In Transit") {
                orderStatus = "shipped";
            } else if (status_code === "PK" || status === "Picked Up") {
                orderStatus = "processing";
            } else if (status_code === "CN" || status === "Cancelled") {
                orderStatus = "cancelled";
            }

            order.status = orderStatus;
            await order.save();

            // Send notification to customer
            const { User } = await import("../models/User.js");
            const user = await User.findById(order.userId);
            if (user?.phone && orderStatus === "delivered") {
                // Note: sendOrderUpdate requires API key and phoneId - implement based on your Aisensy setup
                // const { sendOrderUpdate } = await import("../utils/aisensy.js");
                // await sendOrderUpdate(apiKey, phoneId, user.phone, order.orderId, "delivered");
            }
        }

        return res.json({ success: true });
    } catch (err) {
        return next(err);
    }
});

// Admin: Fetch waybills in advance
delhiveryRouter.get("/delhivery/waybills", requireAuth, async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    try {
        const count = parseInt(req.query.count as string) || 10;
        const result = await fetchWaybills(count);
        return res.json({ data: result });
    } catch (err) {
        return next(err);
    }
});

// Admin or Public: Get estimated TAT
delhiveryRouter.post("/delhivery/tat", async (req, res, next) => {
    const { originPin, destinationPin } = req.body;

    if (!originPin || !destinationPin) {
        return res.status(400).json({ error: "Origin and destination pincodes are required" });
    }

    try {
        const result = await getEstimatedTAT(originPin, destinationPin);
        return res.json({ data: result });
    } catch (err) {
        return next(err);
    }
});

// Admin: Create warehouse
const warehouseSchema = z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    pin: z.string().regex(/^\d{6}$/, "Invalid pincode format"),
    country: z.string().optional(),
    return_address: z.string().optional(),
    return_city: z.string().optional(),
    return_state: z.string().optional(),
    return_pin: z.string().optional(),
    return_country: z.string().optional(),
});

delhiveryRouter.post("/delhivery/warehouse", requireAuth, async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    const parsed = warehouseSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const result = await createWarehouse(parsed.data);
        return res.json({ data: result });
    } catch (err) {
        return next(err);
    }
});

// Admin: Update warehouse
delhiveryRouter.put("/delhivery/warehouse/:name", requireAuth, async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    const { name } = req.params;
    if (!name) {
        return res.status(400).json({ error: "Warehouse name is required" });
    }

    try {
        const result = await updateWarehouse(name, req.body);
        return res.json({ data: result });
    } catch (err) {
        return next(err);
    }
});

// Public: Calculate shipping cost
delhiveryRouter.post("/delhivery/shipping-cost", async (req, res, next) => {
    const schema = z.object({
        originPin: z.string().regex(/^\d{6}$/, "Invalid origin pincode"),
        destinationPin: z.string().regex(/^\d{6}$/, "Invalid destination pincode"),
        weight: z.number().positive(),
        paymentMode: z.enum(["Prepaid", "COD"]),
        codAmount: z.number().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const result = await calculateShippingCost(parsed.data);
        return res.json({ data: result });
    } catch (err) {
        return next(err);
    }
});

// Admin: Update shipment
delhiveryRouter.put("/delhivery/shipment/:waybill", requireAuth, async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    const { waybill } = req.params;
    if (!waybill) {
        return res.status(400).json({ error: "Waybill is required" });
    }

    try {
        const result = await updateShipment(waybill, req.body);
        return res.json({ data: result });
    } catch (err) {
        return next(err);
    }
});

// Admin: Create pickup request
const pickupRequestSchema = z.object({
    pickupLocation: z.string(),
    pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    pickupTime: z.string().regex(/^\d{4}-\d{4}$/, "Invalid time format (HHMM-HHMM)"),
    expectedPackageCount: z.number().optional(),
});

delhiveryRouter.post("/delhivery/pickup-request", requireAuth, async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    const parsed = pickupRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const result = await createPickupRequest(parsed.data);
        return res.json({ data: result });
    } catch (err) {
        return next(err);
    }
});

// Admin: Generate shipping label
delhiveryRouter.post("/delhivery/shipping-label", requireAuth, async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    const { waybills } = req.body;
    if (!waybills || !Array.isArray(waybills) || waybills.length === 0) {
        return res.status(400).json({ error: "Waybills array is required" });
    }

    try {
        const result = await generateShippingLabel(waybills);
        return res.json({ data: result });
    } catch (err) {
        return next(err);
    }
});

// Admin: Download document (POD, QC images)
delhiveryRouter.get("/delhivery/document/:waybill/:type", requireAuth, async (req, res, next) => {
    const userRole = (req as any).userRole;
    if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    const { waybill, type } = req.params;
    if (!waybill) {
        return res.status(400).json({ error: "Waybill is required" });
    }

    if (type !== "pod" && type !== "qc") {
        return res.status(400).json({ error: "Document type must be 'pod' or 'qc'" });
    }

    try {
        const result = await downloadDocument(waybill, type as "pod" | "qc");
        return res.json({ data: result });
    } catch (err) {
        return next(err);
    }
});
