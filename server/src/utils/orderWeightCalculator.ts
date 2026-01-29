// Calculate order weight from items and select box
import { Order } from "../models/Order.js";
import {
  selectBoxForWeight,
  selectBoxForQuantity,
  calculateShipmentWeight,
  BoxCategory,
} from "../config/boxes.js";

export interface OrderWeightCalculation {
  totalProductWeight: number; // in grams
  totalQuantity: number; // total items count
  selectedBox: BoxCategory;
  shipmentWeight: number; // product weight + overhead
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  requiresMPS: boolean; // true if needs Multi-Package Shipment
  mpsBoxCount?: number; // number of boxes needed for MPS
}

/**
 * Calculate weight for an order (from order items)
 */
export async function calculateOrderWeight(
  orderId: string,
): Promise<OrderWeightCalculation> {
  const order = await Order.findById(orderId).populate("items.productId");

  if (!order) {
    throw new Error("Order not found");
  }

  return calculateOrderWeightFromObject(order);
}

/**
 * Calculate weight from an order object (without DB lookup)
 */
export function calculateOrderWeightFromObject(
  order: any,
): OrderWeightCalculation {
  let totalProductWeight = 0;
  let totalQuantity = 0;

  // Sum all item weights and quantities
  for (const item of order.items || []) {
    const quantity = item.quantity || 1;
    let productWeight = (item as any).weight || 0;
    let packetCount = 1;

    // Use product data if available (populating items.productId is recommended)
    const product = (item as any).productId;
    if (product && typeof product === "object") {
      if (product.weight) productWeight = product.weight;
      if (product.packetCount) packetCount = product.packetCount;
    }
    // Fallback: If weight looks low (<=150) but name implies combo (legacy/safety)
    else {
      // ... (Optional: keep regex heuristics if you want robust fallback,
      // but user asked for SCHEMA reliance.
      // Since we migrated, we should rely on product fields if possible.
      // Assuming the controller ALWAYS populates productId now).
      // If not populated, we default to item data.
      productWeight = productWeight || 100;
    }

    // Safety: If migration ran, weight should be correct (e.g. 400).
    // If not, we trust the DB value.

    totalProductWeight += productWeight * quantity;
    // Count total PACKETS (units) for box selection
    totalQuantity += quantity * packetCount;
  }

  // Select box based on quantity (primary method for MPS detection)
  const selectedBox = selectBoxForQuantity(totalQuantity);

  // Check if MPS is required (7+ items)
  const requiresMPS = totalQuantity > 6;

  let shipmentWeight: number;
  let mpsBoxCount: number | undefined;

  if (requiresMPS) {
    // Calculate number of boxes needed (max 6 items per box)
    mpsBoxCount = Math.ceil(totalQuantity / 6);
    // Each MPS box has medium box overhead
    shipmentWeight =
      totalProductWeight + selectedBox.overheadWeightGrams * mpsBoxCount;
  } else {
    // Single box shipment
    // Use the overhead of the box selected by QUANTITY, not purely by weight
    shipmentWeight = totalProductWeight + selectedBox.overheadWeightGrams;
  }

  return {
    totalProductWeight,
    totalQuantity,
    selectedBox,
    shipmentWeight,
    dimensions: selectedBox.dimensionsCm,
    requiresMPS,
    mpsBoxCount,
  };
}

/**
 * @deprecated Use calculateOrderWeightFromObject instead when you have the order object
 * Calculate weight for an order by ID (requires DB lookup)
 */
async function _calculateOrderWeightById(
  orderId: string,
): Promise<OrderWeightCalculation> {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  let totalProductWeight = 0;
  let totalQuantity = 0;

  // Sum all item weights and quantities
  for (const item of order.items) {
    const itemWeight = (item as any).weight || 100; // Default 100g if not set
    const quantity = item.quantity || 1;
    totalProductWeight += itemWeight * quantity;
    totalQuantity += quantity;
  }

  // Select box based on quantity
  const selectedBox = selectBoxForQuantity(totalQuantity);

  // Check if MPS is required (7+ items)
  const requiresMPS = totalQuantity > 6;

  let shipmentWeight: number;
  let mpsBoxCount: number | undefined;

  if (requiresMPS) {
    mpsBoxCount = Math.ceil(totalQuantity / 6);
    shipmentWeight =
      totalProductWeight + selectedBox.overheadWeightGrams * mpsBoxCount;
  } else {
    shipmentWeight = calculateShipmentWeight(totalProductWeight);
  }

  return {
    totalProductWeight,
    totalQuantity,
    selectedBox,
    shipmentWeight,
    dimensions: selectedBox.dimensionsCm,
    requiresMPS,
    mpsBoxCount,
  };
}

/**
 * Calculate weight from cart items (before order creation)
 */
export function calculateCartWeight(
  items: Array<{ weight?: number; quantity: number }>,
): OrderWeightCalculation {
  let totalProductWeight = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const itemWeight = item.weight || 100; // Default 100g
    totalProductWeight += itemWeight * item.quantity;
    totalQuantity += item.quantity;
  }

  const selectedBox = selectBoxForQuantity(totalQuantity);
  const requiresMPS = totalQuantity > 6;

  let shipmentWeight: number;
  let mpsBoxCount: number | undefined;

  if (requiresMPS) {
    mpsBoxCount = Math.ceil(totalQuantity / 6);
    shipmentWeight =
      totalProductWeight + selectedBox.overheadWeightGrams * mpsBoxCount;
  } else {
    shipmentWeight = calculateShipmentWeight(totalProductWeight);
  }

  return {
    totalProductWeight,
    totalQuantity,
    selectedBox,
    shipmentWeight,
    dimensions: selectedBox.dimensionsCm,
    requiresMPS,
    mpsBoxCount,
  };
}
