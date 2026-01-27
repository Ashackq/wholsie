// Shipping calculator controller
import { Request, Response } from "express";
import { calculateShippingCost as delhiveryCalculateShipping } from "../utils/delhivery.js";
import { calculateCartWeight } from "../utils/orderWeightCalculator.js";
import { env } from "../config/env.js";

const FREE_SHIPPING_THRESHOLD = 500;
const ORIGIN_PIN = "415519";

/**
 * Calculate shipping cost for checkout
 * POST /api/shipping/calculate
 */
export async function calculateShipping(req: Request, res: Response) {
  try {
    const { destinationPin, cartTotal, items } = req.body;

    if (!destinationPin) {
      return res.status(400).json({ error: "Destination pincode required" });
    }

    if (cartTotal === undefined) {
      return res.status(400).json({ error: "Cart total required" });
    }

    // Check free shipping
    if (cartTotal >= FREE_SHIPPING_THRESHOLD) {
      return res.json({
        success: true,
        data: {
          shippingCost: 0,
          freeShipping: true,
          message: `Free shipping on orders above ₹${FREE_SHIPPING_THRESHOLD}`,
        },
      });
    }

    // Calculate weight from cart items
    const weightCalc = calculateCartWeight(items || []);

    // Get shipping cost from Delhivery
    const result = await delhiveryCalculateShipping({
      originPin: env.SELLER_PINCODE || ORIGIN_PIN,
      destinationPin,
      weight: weightCalc.shipmentWeight,
      paymentMode: "Prepaid",
    });

    if (!result.success || result.totalAmount === undefined) {
      throw new Error(result.error || "Failed to calculate shipping");
    }

    return res.json({
      success: true,
      data: {
        shippingCost: result.totalAmount,
        freeShipping: false,
        weight: weightCalc.shipmentWeight,
      },
    });
  } catch (error: any) {
    console.error("Shipping calculation error:", error);
    return res.status(500).json({
      error: error.message || "Failed to calculate shipping",
      shippingCost: 50, // Fallback default
    });
  }
}
