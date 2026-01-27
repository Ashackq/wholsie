import mongoose from "mongoose";
import { Order } from "../src/models/Order.js";
import { User } from "../src/models/User.js";
import { Address } from "../src/models/Address.js";
import * as delhiveryUtils from "../src/utils/delhivery.js";
import { env } from "../src/config/env.js";
import { calculateOrderWeight } from "../src/utils/orderWeightCalculator.js";

async function testCreateShipment() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find a recent order that hasn't been shipped yet
    const order = await Order.findOne({
      paymentStatus: "completed",
      delhiveryTrackingId: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!order) {
      console.log("No suitable orders found for testing");
      return;
    }

    console.log("\n=== Order Details ===");
    console.log("Order ID:", order.orderId || order.orderNo);
    console.log("Order _id:", order._id);
    console.log("Payment Status:", order.paymentStatus);
    console.log("Items:", order.items?.length);

    // Get address and user info - shippingAddress is embedded in order
    const shippingAddr = (order as any).shippingAddress;
    const user = order.userId ? await User.findById(order.userId).lean() : null;

    console.log("\n=== Shipping Address ===");
    console.log("Name:", shippingAddr?.name);
    console.log("Address:", shippingAddr?.address);
    console.log("City:", shippingAddr?.city);
    console.log("State:", shippingAddr?.state);
    console.log("Pincode:", shippingAddr?.pincode);
    console.log("Phone:", shippingAddr?.phone);

    // Calculate weight
    const weightCalculation = calculateOrderWeight(order);
    console.log("\n=== Weight Calculation ===");
    console.log("Product Weight:", weightCalculation.productWeight, "g");
    console.log("Box Weight:", weightCalculation.boxWeight, "g");
    console.log("Total Shipment Weight:", weightCalculation.shipmentWeight, "g");
    console.log("Selected Box:", weightCalculation.selectedBox.size);

    // Check pincode serviceability
    const pincode = shippingAddr?.pincode;
    if (pincode) {
      console.log("\n=== Checking Pincode Serviceability ===");
      const serviceability = await delhiveryUtils.checkPincodeServiceability(pincode);
      console.log("Serviceable:", serviceability.serviceable);
      console.log("Remark:", serviceability.remark || "OK");
      
      if (!serviceability.serviceable) {
        console.log("❌ Pincode not serviceable, cannot create shipment");
        return;
      }
    }

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

    // Build order ID string
    const orderIdString = order.orderId || order.orderNo || (order._id ? order._id.toString() : "UNKNOWN");

    // Prepare shipment data
    const shipmentData = {
      shipments: [
        {
          name: customerName,
          add: shippingAddr?.address || "",
          pin: (shippingAddr?.pincode || "").toString(),
          city: shippingAddr?.city || "",
          state: shippingAddr?.state || "",
          country: "India",
          phone: (shippingAddr?.phone || user?.phone || "").toString(),
          order: orderIdString,
          payment_mode: order.paymentStatus === "completed" ? "Prepaid" : "COD" as "Prepaid" | "COD",
          order_date: order.createdAt?.toISOString() || new Date().toISOString(),
          total_amount: (order.total || order.netAmount || 0).toString(),
          products_desc: order.items?.map((item: any) => item.name || item.productName).filter(Boolean).join(", ") || `${order.items?.length || 1} item(s)`,
          quantity: (
            order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 1
          ).toString(),
          weight: weightCalculation.shipmentWeight.toString(),
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

    console.log("\n=== Shipment Data ===");
    console.log(JSON.stringify(shipmentData, null, 2));

    console.log("\n=== Creating Shipment ===");
    const result = await delhiveryUtils.createShipment(shipmentData);

    console.log("\n=== Result ===");
    console.log("Success:", result.success);
    console.log("Waybill:", result.waybill);
    console.log("Packages:", result.packages);
    if (result.error) console.log("Error:", result.error);
    if (result.rmk) console.log("Remark:", result.rmk);

    if (result.success && result.waybill) {
      console.log("\n✅ Shipment created successfully!");
      console.log("Waybill Number:", result.waybill);
      
      // Update order
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            delhiveryTrackingId: result.waybill,
            status: "processing",
          },
        }
      );
      console.log("Order updated with tracking ID");
    } else {
      console.log("\n❌ Failed to create shipment");
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nMongoDB connection closed");
  }
}

testCreateShipment();
