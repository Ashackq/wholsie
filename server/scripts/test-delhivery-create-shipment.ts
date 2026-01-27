import { env } from "../src/config/env.js";

async function testDelhiveryShipment() {
  console.log("=== Testing Delhivery Shipment Creation ===\n");

  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    console.error("❌ DELHIVERY_TOKEN not configured");
    return;
  }

  console.log("Token:", token.substring(0, 20) + "...");
  console.log("API Base:", env.DELHIVERY_API_URL || "https://staging-express.delhivery.com");
  console.log("Seller Name:", env.SELLER_NAME);
  console.log("Seller Pincode:", env.SELLER_PINCODE);
  console.log("");

  // Minimal test shipment data based on Delhivery docs
  // Using ACTUAL registered warehouse details - trying ALL CAPS version
  const shipmentData = {
    shipments: [
      {
        name: "Test Customer",
        add: "Test Address, Test Street",
        pin: "110042",
        city: "Delhi",
        state: "Delhi",
        country: "India",
        phone: "9999999999",
        order: "TEST-ORDER-" + Date.now(),
        payment_mode: "Prepaid",
        order_date: new Date().toISOString(),
        total_amount: "500",
        products_desc: "Test Product",
        quantity: "1",
        weight: "500", // 500 grams
        seller_add: "610, A/p. Songaon tarf, Near Songaon Phata, Opposite Fulpakhru hotel, Songaon",
        seller_name: "DIVAINE LEAF NEUTRA PRIVATE LIMITED",
        shipping_mode: "Surface",
      },
    ],
    pickup_location: {
      name: "DIVAINE LEAF NEUTRA PRIVATE LIMITED", // ALL CAPS version
      pin: "415519",
    },
  };

  console.log("=== Shipment Data ===");
  console.log(JSON.stringify(shipmentData, null, 2));
  console.log("");

  try {
    const DELHIVERY_API_BASE = env.DELHIVERY_API_URL || "https://staging-express.delhivery.com";
    const url = `${DELHIVERY_API_BASE}/api/cmu/create.json`;

    console.log("Posting to:", url);
    console.log("");

    const formData = new URLSearchParams();
    formData.append("format", "json");
    formData.append("data", JSON.stringify(shipmentData));

    console.log("=== Form Data ===");
    console.log("format:", "json");
    console.log("data:", JSON.stringify(shipmentData));
    console.log("");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    console.log("Response Status:", response.status, response.statusText);
    console.log("");

    const responseText = await response.text();
    console.log("=== Response ===");
    console.log(responseText);
    console.log("");

    if (!response.ok) {
      console.error("❌ API Error:", response.status);
      return;
    }

    try {
      const data = JSON.parse(responseText);
      console.log("=== Parsed Response ===");
      console.log(JSON.stringify(data, null, 2));
      console.log("");

      if (data.success) {
        console.log("✅ Shipment created successfully!");
        console.log("Waybill:", data.waybill);
        console.log("Packages:", data.packages);
      } else {
        console.log("❌ Shipment creation failed");
        console.log("Error:", data.error);
        console.log("Remark:", data.rmk);
      }
    } catch (parseError) {
      console.error("Failed to parse JSON response");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testDelhiveryShipment();
