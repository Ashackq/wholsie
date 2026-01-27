import { env } from "../src/config/env.js";

console.log("\n=== Delhivery Configuration Check ===\n");

console.log("Environment Variables:");
console.log("- DELHIVERY_TOKEN:", env.DELHIVERY_TOKEN ? `${env.DELHIVERY_TOKEN.substring(0, 20)}... (${env.DELHIVERY_TOKEN.length} chars)` : "❌ NOT SET");
console.log("- DELHIVERY_API_URL:", env.DELHIVERY_API_URL || "https://staging-express.delhivery.com (default)");
console.log("- DELHIVERY_TRACK_API_URL:", env.DELHIVERY_TRACK_API_URL || "https://track.delhivery.com (default)");
console.log("- SELLER_NAME:", env.SELLER_NAME || "❌ NOT SET");
console.log("- SELLER_PINCODE:", env.SELLER_PINCODE || "❌ NOT SET");
console.log("- SELLER_ADDRESS:", env.SELLER_ADDRESS || "❌ NOT SET");

console.log("\n=== Recommendations ===\n");

if (!env.SELLER_NAME || !env.SELLER_PINCODE || !env.SELLER_ADDRESS) {
  console.log("⚠️  Missing seller configuration. Please set:");
  console.log("   - SELLER_NAME (must match EXACTLY the warehouse name registered with Delhivery)");
  console.log("   - SELLER_PINCODE");
  console.log("   - SELLER_ADDRESS");
}

console.log("\n📋 Next Steps:");
console.log("1. Contact Delhivery to confirm your pickup location is registered");
console.log("2. Verify the exact warehouse name as registered (case and space sensitive)");
console.log("3. Make sure SELLER_NAME in .env matches the registered warehouse name EXACTLY");
console.log("4. Check if you need to register this pickup location first");
console.log("");
console.log("💡 The 500 error might mean:");
console.log("   - Pickup location 'Wholesiii' is not registered in Delhivery");
console.log("   - API token doesn't have permission for this operation");
console.log("   - Staging environment requires different configuration");
console.log("");
console.log("🔧 To fix:");
console.log("   - Contact Delhivery support to register your pickup location");
console.log("   - Or use their web portal to register the warehouse");
console.log("   - Update SELLER_NAME in .env to match the registered name");
console.log("");
