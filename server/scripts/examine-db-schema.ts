// Script to examine database schema and sample data
// Run with: npx tsx scripts/examine-db-schema.ts

import mongoose from "mongoose";
import { config } from "dotenv";
import { Product } from "../src/models/Product.js";
import { Order } from "../src/models/Order.js";
import { User } from "../src/models/User.js";

config();

async function examineSchema() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/wholesiii",
    );
    console.log("✅ Connected to MongoDB\n");

    // ==================== PRODUCTS ====================
    console.log("═══════════════════════════════════════════════════");
    console.log("📦 PRODUCTS SCHEMA & DATA");
    console.log("═══════════════════════════════════════════════════\n");

    const products = await Product.find({}).limit(3);
    console.log(`Total Products: ${await Product.countDocuments()}`);

    if (products.length > 0) {
      console.log("\n📋 Product Schema (from first product):");
      const productKeys = Object.keys(products[0].toObject());
      productKeys.forEach((key) => {
        const value = (products[0] as any)[key];
        const type = typeof value;
        const valuePreview =
          type === "object" && value !== null
            ? JSON.stringify(value).slice(0, 50) + "..."
            : value;
        console.log(`   ${key}: ${type} = ${valuePreview}`);
      });

      console.log("\n📄 Sample Product (Full JSON):");
      console.log(JSON.stringify(products[0].toObject(), null, 2));
    }

    // ==================== ORDERS ====================
    console.log("\n\n═══════════════════════════════════════════════════");
    console.log("🛒 ORDERS SCHEMA & DATA");
    console.log("═══════════════════════════════════════════════════\n");

    const orders = await Order.find({}).populate("userId").limit(2);
    console.log(`Total Orders: ${await Order.countDocuments()}`);

    if (orders.length > 0) {
      console.log("\n📋 Order Schema (from first order):");
      const orderKeys = Object.keys(orders[0].toObject());
      orderKeys.forEach((key) => {
        const value = (orders[0] as any)[key];
        const type = typeof value;
        const valuePreview =
          type === "object" && value !== null
            ? JSON.stringify(value).slice(0, 50) + "..."
            : value;
        console.log(`   ${key}: ${type} = ${valuePreview}`);
      });

      console.log("\n📄 Sample Order (Full JSON):");
      console.log(JSON.stringify(orders[0].toObject(), null, 2));

      // Check items structure
      if (orders[0].items && orders[0].items.length > 0) {
        console.log("\n📦 Order Items Structure:");
        console.log(JSON.stringify(orders[0].items[0], null, 2));
      }
    }

    // ==================== USERS ====================
    console.log("\n\n═══════════════════════════════════════════════════");
    console.log("👤 USERS SCHEMA & DATA");
    console.log("═══════════════════════════════════════════════════\n");

    const users = await User.find({}).limit(1);
    console.log(`Total Users: ${await User.countDocuments()}`);

    if (users.length > 0) {
      console.log("\n📋 User Schema (from first user):");
      const userObj = users[0].toObject();
      const userKeys = Object.keys(userObj);
      userKeys.forEach((key) => {
        if (key === "password") {
          console.log(`   ${key}: [HIDDEN]`);
        } else {
          const value = (users[0] as any)[key];
          const type = typeof value;
          const valuePreview =
            type === "object" && value !== null
              ? JSON.stringify(value).slice(0, 50) + "..."
              : value;
          console.log(`   ${key}: ${type} = ${valuePreview}`);
        }
      });

      console.log("\n📄 Sample User (Full JSON - password hidden):");
      const userForDisplay = { ...userObj, password: "[HIDDEN]" };
      console.log(JSON.stringify(userForDisplay, null, 2));
    }

    // ==================== SUMMARY ====================
    console.log("\n\n═══════════════════════════════════════════════════");
    console.log("📊 DATABASE SUMMARY");
    console.log("═══════════════════════════════════════════════════\n");

    const stats = {
      products: await Product.countDocuments(),
      orders: await Order.countDocuments(),
      users: await User.countDocuments(),
      productsWithWeight: await Product.countDocuments({
        weight: { $exists: true, $gt: 0 },
      }),
      productsWithoutWeight: await Product.countDocuments({
        $or: [{ weight: { $exists: false } }, { weight: 0 }],
      }),
      ordersWithTracking: await Order.countDocuments({
        delhiveryTrackingId: { $exists: true, $ne: null },
      }),
      ordersWithoutTracking: await Order.countDocuments({
        $or: [
          { delhiveryTrackingId: { $exists: false } },
          { delhiveryTrackingId: null },
        ],
      }),
      completedOrders: await Order.countDocuments({
        paymentStatus: "completed",
      }),
      pendingOrders: await Order.countDocuments({ paymentStatus: "pending" }),
    };

    console.log("📈 Statistics:");
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

examineSchema();
