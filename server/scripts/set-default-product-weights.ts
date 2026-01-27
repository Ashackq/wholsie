// Migration script to set default weight for products without weight
// Run with: npx tsx scripts/set-default-product-weights.ts

import mongoose from "mongoose";
import { config } from "dotenv";
import { Product } from "../src/models/Product.js";

config();

const DEFAULT_WEIGHT_GRAMS = 100; // 100g default for light snack products

async function setDefaultWeights() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/wholesiii",
    );
    console.log("✅ Connected to MongoDB\n");

    // Find products without weight
    const productsWithoutWeight = await Product.find({
      $or: [{ weight: { $exists: false } }, { weight: null }, { weight: 0 }],
    });

    console.log(
      `📦 Found ${productsWithoutWeight.length} products without weight\n`,
    );

    if (productsWithoutWeight.length === 0) {
      console.log("✅ All products already have weight set!");
      await mongoose.disconnect();
      return;
    }

    // Update products
    const result = await Product.updateMany(
      {
        $or: [{ weight: { $exists: false } }, { weight: null }, { weight: 0 }],
      },
      {
        $set: { weight: DEFAULT_WEIGHT_GRAMS },
      },
    );

    console.log(
      `✅ Updated ${result.modifiedCount} products with default weight of ${DEFAULT_WEIGHT_GRAMS}g\n`,
    );

    // Verify update
    const updatedProducts = await Product.find({
      weight: DEFAULT_WEIGHT_GRAMS,
    }).limit(5);
    console.log("📋 Sample updated products:");
    updatedProducts.forEach((p) => {
      console.log(`   ${p.name}: ${p.weight}g`);
    });

    // Summary
    const stats = {
      totalProducts: await Product.countDocuments(),
      withWeight: await Product.countDocuments({
        weight: { $exists: true, $gt: 0 },
      }),
      withoutWeight: await Product.countDocuments({
        $or: [{ weight: { $exists: false } }, { weight: 0 }],
      }),
    };

    console.log("\n📊 Final Statistics:");
    console.log(`   Total Products: ${stats.totalProducts}`);
    console.log(`   With Weight: ${stats.withWeight}`);
    console.log(`   Without Weight: ${stats.withoutWeight}`);

    await mongoose.disconnect();
    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

setDefaultWeights();
