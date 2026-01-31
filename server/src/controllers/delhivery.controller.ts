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
        ? {
            $or: [{ _id: orderId }, { orderId: orderId }, { orderNo: orderId }],
          }
        : { $or: [{ orderId: orderId }, { orderNo: orderId }] },
    )
      .populate("userId shippingAddress")
      .populate("items.productId");

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
    const requiresMPS = weightCalculation.requiresMPS;
    const mpsBoxCount = weightCalculation.mpsBoxCount || 1;

    console.log(`=== Shipment Calculation ===`);
    console.log(`Total Quantity: ${weightCalculation.totalQuantity}`);
    console.log(`Requires MPS: ${requiresMPS}`);
    console.log(`Box Count: ${mpsBoxCount}`);
    console.log(`Box Type: ${weightCalculation.selectedBox.name}`);

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
    const orderIdString =
      order.orderId || (order._id ? order._id.toString() : "UNKNOWN");

    // Prepare shipment data
    let shipmentData: any;
    let masterWaybill: string | undefined;

    console.log(
      `Debug MPS Check: Order=${orderIdString}, Qty=${weightCalculation.totalQuantity}, MPS=${requiresMPS}, Max Mps Threshold=6`,
    );

    let fetchedWaybills: string[] = [];
    if (requiresMPS) {
      // Multi-Package Shipment (MPS) - 7+ items
      console.log(`Creating MPS with ${mpsBoxCount} boxes`);

      // Fetch waybills from Delhivery for MPS
      // We need mpsBoxCount waybills (one per box, first one is master)
      console.log(`Fetching ${mpsBoxCount} waybills from Delhivery for MPS...`);
      const waybillResult = await delhiveryUtils.fetchWaybills(mpsBoxCount);

      if (
        !waybillResult.success ||
        !waybillResult.waybills ||
        waybillResult.waybills.length < mpsBoxCount
      ) {
        return res.status(500).json({
          error: "Failed to fetch waybills from Delhivery",
          details:
            waybillResult.error ||
            `Needed ${mpsBoxCount} waybills but got ${waybillResult.waybills?.length || 0}`,
        });
      }

      fetchedWaybills = waybillResult.waybills;
      masterWaybill = fetchedWaybills[0]; // First waybill is the master
      console.log(
        `Fetched waybills: Master=${masterWaybill}, Children=${fetchedWaybills.slice(1).join(", ")}`,
      );

      const shipments = [];

      // Calculate items per box (distribute evenly)
      const itemsPerBox = Math.ceil(
        weightCalculation.totalQuantity / mpsBoxCount,
      );
      const weightPerBox = Math.ceil(
        weightCalculation.totalProductWeight / mpsBoxCount,
      );

      for (let i = 0; i < mpsBoxCount; i++) {
        const boxWeight =
          weightPerBox +
          (weightCalculation.selectedBox.overheadWeightGrams || 220);
        const childWaybill = fetchedWaybills[i];

        shipments.push({
          name: customerName,
          add: shippingAddr?.street || shippingAddr?.address || "",
          pin: (
            shippingAddr?.postalCode ||
            shippingAddr?.pincode ||
            ""
          ).toString(),
          city: shippingAddr?.city || "",
          state: shippingAddr?.state || "",
          country: shippingAddr?.country || "India",
          phone: phone.toString(),
          order: orderIdString,
          payment_mode:
            order.paymentStatus === "completed"
              ? "Prepaid"
              : ("COD" as "Prepaid" | "COD"),
          order_date:
            order.createdAt?.toISOString() || new Date().toISOString(),
          total_amount: (order.total || 0).toString(),
          products_desc: `Box ${i + 1}/${mpsBoxCount}: ${
            order.items
              ?.map((item: any) => item.name || item.productName)
              .filter(Boolean)
              .join(", ") || `${order.items?.length || 1} item(s)`
          }`,
          quantity: itemsPerBox.toString(),
          weight: boxWeight.toString(),
          shipment_length: boxDimensions.length.toString(),
          shipment_width: boxDimensions.breadth.toString(),
          shipment_height: boxDimensions.height.toString(),
          seller_add: env.SELLER_ADDRESS || "Warehouse",
          seller_name: env.SELLER_NAME || "Wholesiii",
          shipping_mode: "Surface",
          cod_amount:
            order.paymentStatus === "completed"
              ? ""
              : i === 0
                ? (order.total || 0).toString()
                : "0", // COD only on first box
          // MPS specific fields - Adjusted for potential API issues
          waybill: childWaybill, // Valid waybill from fetch
          // shipment_type: "MPS", // Commented out to avoid schema validation errors if invalid
          // master_id: masterWaybill, // Renaming to potentially correct field if needed, but keeping for reference
          // Try passing empty string for non-master? No, Delhivery usually links by common ref or master waybill
        });
      }

      shipmentData = {
        shipments,
        pickup_location: {
          name: env.SELLER_NAME || "Wholesiii",
          pin: env.SELLER_PINCODE || "",
        },
      };
    } else {
      // Single shipment (1-6 items)
      shipmentData = {
        shipments: [
          {
            name: customerName,
            add: shippingAddr?.street || shippingAddr?.address || "",
            pin: (
              shippingAddr?.postalCode ||
              shippingAddr?.pincode ||
              ""
            ).toString(),
            city: shippingAddr?.city || "",
            state: shippingAddr?.state || "",
            country: shippingAddr?.country || "India",
            phone: phone.toString(),
            order: orderIdString,
            payment_mode:
              order.paymentStatus === "completed"
                ? "Prepaid"
                : ("COD" as "Prepaid" | "COD"),
            order_date:
              order.createdAt?.toISOString() || new Date().toISOString(),
            total_amount: (order.total || 0).toString(),
            products_desc:
              order.items
                ?.map((item: any) => item.name || item.productName)
                .filter(Boolean)
                .join(", ") || `${order.items?.length || 1} item(s)`,
            quantity: weightCalculation.totalQuantity.toString(),
            weight: shipmentWeight.toString(),
            shipment_length: boxDimensions.length.toString(),
            shipment_width: boxDimensions.breadth.toString(),
            shipment_height: boxDimensions.height.toString(),
            seller_add: env.SELLER_ADDRESS || "Warehouse",
            seller_name: env.SELLER_NAME || "Wholesiii",
            shipping_mode: "Surface",
            cod_amount:
              order.paymentStatus === "completed"
                ? ""
                : (order.total || 0).toString(),
          },
        ],
        pickup_location: {
          name: env.SELLER_NAME || "Wholesiii",
          pin: env.SELLER_PINCODE || "",
        },
      };
    }

    // Log the shipment data for debugging
    console.log("=== Creating Delhivery Shipment ===");
    console.log("Order ID:", orderIdString);
    console.log(
      "Shipment Type:",
      requiresMPS ? "MPS (Multi-Package)" : "Single Package",
    );
    if (requiresMPS && masterWaybill) {
      console.log("Master Waybill:", masterWaybill);
    }
    console.log("Shipment Data:", JSON.stringify(shipmentData, null, 2));

    // Create shipment with Delhivery
    const result = await delhiveryUtils.createShipment(shipmentData);

    // For MPS, check if all packages were created successfully
    if (requiresMPS) {
      if (!result.success) {
        return res.status(400).json({
          error: "Failed to create MPS shipment",
          details: result.rmk || result.error,
        });
      }

      // Update order with master waybill and all MPS waybills
      (order as any).delhiveryTrackingId = masterWaybill;
      (order as any).mpsWaybills = fetchedWaybills;
      (order as any).status = "processing";
      await order.save();

      return res.status(200).json({
        success: true,
        data: {
          waybill: masterWaybill, // Master waybill for tracking
          mpsWaybills: fetchedWaybills, // All child waybills
          packages: result.packages,
          orderId: order._id,
          shipmentType: "MPS",
          boxCount: mpsBoxCount,
        },
      });
    }

    // Single shipment response
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
        shipmentType: "Single",
        boxCount: 1,
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

    // Check if this is an MPS order by finding the order with this master waybill
    const order = await Order.findOne({ delhiveryTrackingId: waybill });

    let waybillsToTrack: string | string[] = waybill;

    // If order has MPS waybills, track all of them
    if (order && order.mpsWaybills && order.mpsWaybills.length > 0) {
      // Track master waybill + all child waybills
      waybillsToTrack = [waybill, ...order.mpsWaybills];
    }

    const result = await delhiveryUtils.getTrackingStatus(waybillsToTrack);

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
