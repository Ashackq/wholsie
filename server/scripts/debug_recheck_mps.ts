import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { Order } from "../src/models/Order.js";
import "../src/models/Product.js";
import { calculateOrderWeightFromObject } from "../src/utils/orderWeightCalculator.js";

async function checkWeight() {
  try {
    await mongoose.connect(env.MONGODB_URI);

    const orderId = "ORD-1769636230475";
    const order = await Order.findOne({ orderId }).populate("items.productId");

    if (!order) {
      console.log("Order not found");
      return;
    }

    console.log("Found Order. Items:", order.items.length);
    const calc = calculateOrderWeightFromObject(order);

    console.log("--- Calculation Result ---");
    console.log("Total Product Weight:", calc.totalProductWeight);
    console.log("Total Quantity (Packets):", calc.totalQuantity);
    console.log("Requires MPS:", calc.requiresMPS);
    console.log("MPS Box Count:", calc.mpsBoxCount);
    console.log("Selected Box:", calc.selectedBox.name);
    console.log("Shipment Weight:", calc.shipmentWeight);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkWeight();
