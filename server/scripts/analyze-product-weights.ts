// Script to analyze product weights in the database
// Run with: npx tsx scripts/analyze-product-weights.ts

import mongoose from "mongoose";
import { config } from "dotenv";
import { Product } from "../src/models/Product.js";

config();

async function analyzeProductWeights() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/wholesiii",
    );
    console.log("✅ Connected to MongoDB");

    const products = await Product.find({}, "name weight price");

    console.log(`\n📊 Total Products: ${products.length}\n`);

    const productsWithWeight = products.filter((p) => p.weight && p.weight > 0);
    const productsWithoutWeight = products.filter(
      (p) => !p.weight || p.weight === 0,
    );

    console.log(`Products WITH weight: ${productsWithWeight.length}`);
    console.log(`Products WITHOUT weight: ${productsWithoutWeight.length}\n`);

    if (productsWithWeight.length > 0) {
      const weights = productsWithWeight.map((p) => p.weight).filter((w) => w);
      const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
      const minWeight = Math.min(...weights);
      const maxWeight = Math.max(...weights);
      const medianWeight = weights.sort((a, b) => a - b)[
        Math.floor(weights.length / 2)
      ];

      console.log("📦 Weight Statistics (in grams):");
      console.log(`   Average: ${avgWeight.toFixed(2)}g`);
      console.log(`   Median: ${medianWeight}g`);
      console.log(`   Min: ${minWeight}g`);
      console.log(`   Max: ${maxWeight}g`);

      console.log("\n📋 Sample Products with Weights:");
      productsWithWeight.slice(0, 10).forEach((p) => {
        console.log(`   ${p.name}: ${p.weight}g (₹${p.price})`);
      });
    }

    if (productsWithoutWeight.length > 0) {
      console.log("\n⚠️  Products WITHOUT Weight:");
      productsWithoutWeight.slice(0, 10).forEach((p) => {
        console.log(`   ${p.name} (₹${p.price})`);
      });
    }

    console.log("\n💡 Recommended Default Weight:");
    if (productsWithWeight.length > 0) {
      const weights = productsWithWeight.map((p) => p.weight).filter((w) => w);
      const medianWeight = weights.sort((a, b) => a - b)[
        Math.floor(weights.length / 2)
      ];
      console.log(`   Based on median: ${medianWeight}g`);
      console.log(`   Conservative estimate: 250g (safe for most products)`);
    } else {
      console.log(`   No weight data available, suggest: 250g as safe default`);
    }

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

analyzeProductWeights();
