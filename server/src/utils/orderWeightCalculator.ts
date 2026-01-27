// Calculate order weight from items and select box
import { Order } from "../models/Order.js";
import {
  selectBoxForWeight,
  calculateShipmentWeight,
  BoxCategory,
} from "../config/boxes.js";

export interface OrderWeightCalculation {
  totalProductWeight: number; // in grams
  selectedBox: BoxCategory;
  shipmentWeight: number; // product weight + overhead
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
}

/**
 * Calculate weight for an order (from order items)
 */
export async function calculateOrderWeight(
  orderId: string,
): Promise<OrderWeightCalculation> {
  const order = await Order.findById(orderId);

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

  // Sum all item weights
  for (const item of order.items || []) {
    const itemWeight = (item as any).weight || 100; // Default 100g if not set
    totalProductWeight += itemWeight * (item.quantity || 1);
  }

  // Select appropriate box
  const selectedBox = selectBoxForWeight(totalProductWeight);

  // Calculate shipment weight
  const shipmentWeight = calculateShipmentWeight(totalProductWeight);

  return {
    totalProductWeight,
    selectedBox,
    shipmentWeight,
    dimensions: selectedBox.dimensionsCm,
  };
}

/**
 * @deprecated Use calculateOrderWeightFromObject instead when you have the order object
 * Calculate weight for an order by ID (requires DB lookup)
 */
async function _calculateOrderWeightById(orderId: string): Promise<OrderWeightCalculation> {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  let totalProductWeight = 0;

  // Sum all item weights
  for (const item of order.items) {
    const itemWeight = (item as any).weight || 100; // Default 100g if not set
    totalProductWeight += itemWeight * (item.quantity || 1);
  }

  // Select appropriate box
  const selectedBox = selectBoxForWeight(totalProductWeight);

  // Calculate shipment weight
  const shipmentWeight = calculateShipmentWeight(totalProductWeight);

  return {
    totalProductWeight,
    selectedBox,
    shipmentWeight,
    dimensions: selectedBox.dimensionsCm,
  };
}

/**
 * Calculate weight from cart items (before order creation)
 */
export function calculateCartWeight(
  items: Array<{ weight?: number; quantity: number }>,
): OrderWeightCalculation {
  let totalProductWeight = 0;

  for (const item of items) {
    const itemWeight = item.weight || 100; // Default 100g
    totalProductWeight += itemWeight * item.quantity;
  }

  const selectedBox = selectBoxForWeight(totalProductWeight);
  const shipmentWeight = calculateShipmentWeight(totalProductWeight);

  return {
    totalProductWeight,
    selectedBox,
    shipmentWeight,
    dimensions: selectedBox.dimensionsCm,
  };
}
