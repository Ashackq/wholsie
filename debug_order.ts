
import mongoose from "mongoose";
import { Order } from "./server/src/models/Order";
import dotenv from "dotenv";

dotenv.config({ path: "./server/.env" });

async function checkOrder() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/wholesiii");
    console.log("Connected at: " + new Date().toISOString());

    // Search by Tracking ID
    const trackingId = "45783110000254"; 
    const order = await Order.findOne({ delhiveryTrackingId: trackingId });

    if (!order) {
        console.log(`Order with tracking ID ${trackingId} not found.`);
        // Try searching by the Order ID associated with the crash (ORD-1769636230475)
        const crashOrder = await Order.findOne({ orderId: "ORD-1769636230475" });
        if(crashOrder) {
            console.log("Found the Crashing Order:", crashOrder.orderId);
            console.log("Tracking ID:", crashOrder.delhiveryTrackingId);
            console.log("MPS Waybills:", crashOrder.mpsWaybills); 
        }
        return;
    }

    console.log("Found Order:", order.orderId);
    console.log("Tracking ID:", order.delhiveryTrackingId);
    console.log("MPS Waybills:", order.mpsWaybills); 
    console.log("Length of MPS:", order.mpsWaybills ? order.mpsWaybills.length : "undefined");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkOrder();
