
import mongoose from "mongoose";
import { Order } from "./server/src/models/Order";
import dotenv from "dotenv";

dotenv.config({ path: "./server/.env" });

async function checkOrder() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/wholesiii");
    console.log("Connected to DB");

    const orderId = "ORD-1769647848899"; // The order user mentioned
    // const orderId = "ORD-1769649567954"; // Another one from prev conversation if needed?
    // Actually let's search by the ID in the prompt
    
    // Note: The user mentioned ORD-1769647848899. 
    // Wait, the prompt says "is this shipment creation correct... we need to be abnle to see all the waybill id's right" 
    // for order ORD-1769647848899.

    const order = await Order.findOne({ orderId: "ORD-1769647848899" });

    if (!order) {
        console.log("Order not found!");
        return;
    }

    console.log("Found Order:", order.orderId);
    console.log("MPS Waybills in DB:", order.mpsWaybills); // Check this field specifically
    console.log("Tracking ID:", order.delhiveryTrackingId);

    if (order.mpsWaybills && order.mpsWaybills.length > 0) {
        console.log("✅ MPS Waybills exist.");
    } else {
        console.log("❌ NO MPS Waybills found.");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkOrder();
