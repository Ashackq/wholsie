import { Request, Response } from "express";
import * as delhiveryUtils from "../utils/delhivery.js";
import { Order } from "../models/Order.js";
import { env } from "../config/env.js";
import { calculateOrderWeightFromObject } from "../utils/orderWeightCalculator.js";

/**
 * Create a shipment with Delhivery
 */
export async function createShipment(req: Request, res: Response) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        error: "Order ID is required",
      });
    }

    // Find the order in database
    // If orderId looks like MongoDB ObjectId (24 hex chars), search by _id, otherwise by orderId field
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderId);
    const order = await Order.findOne(
      isObjectId 
        ? { $or: [{ _id: orderId }, { orderId: orderId }, { orderNo: orderId }] }
        : { $or: [{ orderId: orderId }, { orderNo: orderId }] }
    ).populate("userId shippingAddress");

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    if (order.delhiveryTrackingId) {
      return res.status(400).json({
        error: "Shipment already created for this order",
      });
    }

    if (order.paymentStatus !== "completed") {
      return res.status(400).json({
        error: "Payment must be completed before creating shipment",
      });
    }

    // Calculate shipment weight using order weight calculator
    const weightCalculation = calculateOrderWeightFromObject(order);
    const shipmentWeight = weightCalculation.shipmentWeight || 100; // Fallback to 100g if undefined
    const boxDimensions = weightCalculation.dimensions; // Box dimensions from weight calculator

    // Check if destination pincode is serviceable
    const shippingPin =
      (order.shippingAddress as any)?.postalCode || (order as any)?.shippingPin;
    if (shippingPin) {
      const serviceability =
        await delhiveryUtils.checkPincodeServiceability(shippingPin);
      if (!serviceability.serviceable) {
        return res.status(400).json({
          error: "Delivery not available for this pincode",
          details: serviceability.remark || "Non-serviceable zone",
        });
      }
    }

    // Prepare shipment data
    const user = (order as any).userId as any;
    const shippingAddr = (order as any).shippingAddress as any;

    // Build customer name
    let customerName = shippingAddr?.name || "";
    if (!customerName && user) {
      if (user.name) {
        customerName = user.name;
      } else if (user.firstName || user.lastName) {
        customerName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      }
    }
    if (!customerName) {
      customerName = "Customer";
    }

    // Build phone number
    const phone = shippingAddr?.phone || user?.phone || "";
    if (!phone) {
      return res.status(400).json({
        error: "Phone number is required for shipment creation",
      });
    }

    // Build order ID string
    const orderIdString = order.orderId || order.orderNo || (order._id ? order._id.toString() : "UNKNOWN");

    const shipmentData = {
      shipments: [
        {
          name: customerName,
          add: shippingAddr?.street || shippingAddr?.address || "",
          pin: (shippingAddr?.postalCode || shippingAddr?.pincode || "").toString(),
          city: shippingAddr?.city || "",
          state: shippingAddr?.state || "",
          country: shippingAddr?.country || "India",
          phone: phone.toString(),
          order: orderIdString,
          payment_mode: order.paymentStatus === "completed" ? "Prepaid" : "COD" as "Prepaid" | "COD",
          order_date:
            order.createdAt?.toISOString() || new Date().toISOString(),
          total_amount:
            (order.total || order.netAmount || 0).toString(),
          products_desc: order.items?.map((item: any) => item.name || item.productName).filter(Boolean).join(", ") || `${order.items?.length || 1} item(s)`,
          quantity: (
            order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) ||
            1
          ).toString(),
          weight: shipmentWeight.toString(),
          shipment_length: boxDimensions.length.toString(),
          shipment_width: boxDimensions.breadth.toString(),
          shipment_height: boxDimensions.height.toString(),
          seller_add: env.SELLER_ADDRESS || "Warehouse",
          seller_name: env.SELLER_NAME || "Wholesiii",
          shipping_mode: "Surface",
          cod_amount: order.paymentStatus === "completed" ? "" : (order.total || order.netAmount || 0).toString(),
        },
      ],
      pickup_location: {
        name: env.SELLER_NAME || "Wholesiii",
        pin: env.SELLER_PINCODE || "",
      },
    };

    // Log the shipment data for debugging
    console.log("=== Creating Delhivery Shipment ===");
    console.log("Order ID:", orderIdString);
    console.log("Shipment Data:", JSON.stringify(shipmentData, null, 2));

    // Create shipment with Delhivery
    const result = await delhiveryUtils.createShipment(shipmentData);

    if (!result.success || !result.waybill) {
      return res.status(400).json({
        error: "Failed to create shipment",
        details: result.rmk || result.error,
      });
    }

    // Update order with tracking ID
    (order as any).delhiveryTrackingId = result.waybill;
    (order as any).status = "processing";
    await order.save();

    return res.status(200).json({
      success: true,
      data: {
        waybill: result.waybill,
        packages: result.packages,
        orderId: order._id,
      },
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("Delhivery create shipment error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create shipment",
    });
  }
}

/**
 * Cancel a shipment
 */
export async function cancelShipment(req: Request, res: Response) {
  try {
    const { waybill } = req.body;

    if (!waybill) {
      return res.status(400).json({
        error: "Waybill number is required",
      });
    }

    // Find order by tracking ID
    const order = await Order.findOne({ delhiveryTrackingId: waybill });

    if (!order) {
      return res.status(404).json({
        error: "Order with this tracking ID not found",
      });
    }

    // Cancel with Delhivery
    const result = await delhiveryUtils.cancelShipment(waybill);

    if (!result.success) {
      return res.status(400).json({
        error: "Failed to cancel shipment",
        message: result.message,
      });
    }

    // Update order status
    (order as any).status = "cancelled";
    (order as any).delhiveryTrackingId = undefined;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Shipment cancelled successfully",
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("Delhivery cancel shipment error:", error);
    return res.status(500).json({
      error: error.message || "Failed to cancel shipment",
    });
  }
}

/**
 * Check pincode serviceability
 */
export async function checkPincode(req: Request, res: Response) {
  try {
    const { pincode } = req.body;

    if (!pincode) {
      return res.status(400).json({
        error: "Pincode is required",
      });
    }

    const result = await delhiveryUtils.checkPincodeServiceability(pincode);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("Delhivery pincode check error:", error);
    return res.status(500).json({
      error: error.message || "Failed to check pincode serviceability",
    });
  }
}

/**
 * Get expected TAT between origin and destination pincodes
 */
export async function getExpectedTat(req: Request, res: Response) {
  try {
    const { destinationPin, mot, pdt, expectedPickupDate } = req.body;
    const originPin =
      req.body.originPin || env.SELLER_PINCODE || env.TEST_PINCODE;

    if (!destinationPin) {
      return res.status(400).json({ error: "destinationPin is required" });
    }

    const data = await delhiveryUtils.getExpectedTat({
      originPin,
      destinationPin,
      mot,
      pdt,
      expectedPickupDate,
    });

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("Delhivery TAT error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch expected TAT" });
  }
}

/**
 * Get shipping charges quote
 */
export async function getShippingCharges(req: Request, res: Response) {
  try {
    const {
      destinationPin,
      weight,
      paymentMode = "Pre-paid",
      codAmount,
    } = req.body;
    const originPin =
      req.body.originPin || env.SELLER_PINCODE || env.TEST_PINCODE;

    if (
      !originPin ||
      !destinationPin ||
      weight === undefined ||
      weight === null
    ) {
      return res
        .status(400)
        .json({ error: "originPin, destinationPin, and weight are required" });
    }

    const numericWeight = Number(weight);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      return res
        .status(400)
        .json({ error: "weight must be a positive number (grams)" });
    }

    const data = await delhiveryUtils.getShippingCharges({
      originPin,
      destinationPin,
      weight: numericWeight,
      paymentMode,
      codAmount,
    });

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("Delhivery shipping charge error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch shipping charges" });
  }
}

/**
 * Get tracking status
 */
export async function getTracking(req: Request, res: Response) {
  try {
    const { waybill } = req.params;

    if (!waybill) {
      return res.status(400).json({
        error: "Waybill number is required",
      });
    }

    const result = await delhiveryUtils.getTrackingStatus(waybill);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("Delhivery tracking error:", error);
    return res.status(500).json({
      error: error.message || "Failed to get tracking status",
    });
  }
}
