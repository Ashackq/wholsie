// Box categorization based on weight
// Used to determine packaging and shipping dimensions

export interface BoxCategory {
  id: string;
  name: string;
  maxWeightGrams: number;
  dimensionsCm: {
    length: number;
    breadth: number;
    height: number;
  };
  overheadWeightGrams: number;
}

export const BOX_CATEGORIES: BoxCategory[] = [
  {
    id: "box-s",
    name: "Small Box (2-3 packets)",
    maxWeightGrams: 600, // 3 packets * 100g + overhead
    dimensionsCm: { length: 18.5, breadth: 18.5, height: 20 },
    overheadWeightGrams: 150, // 140-150g box weight
  },
  {
    id: "box-m",
    name: "Medium Box (4-6 packets)",
    maxWeightGrams: 1200, // 6 packets * 100g + overhead
    dimensionsCm: { length: 31, breadth: 18.5, height: 25 },
    overheadWeightGrams: 220, // 200-220g box weight
  },
  {
    id: "box-mps",
    name: "Multi-Package Shipment (7+ packets)",
    maxWeightGrams: Number.MAX_SAFE_INTEGER,
    dimensionsCm: { length: 31, breadth: 18.5, height: 25 }, // Use medium box dimensions for each MPS box
    overheadWeightGrams: 220, // Each box in MPS uses medium box overhead
  },
];

/**
 * Select appropriate box based on quantity (for MPS detection)
 */
export function selectBoxForQuantity(totalQuantity: number): BoxCategory {
  if (totalQuantity <= 3) {
    return BOX_CATEGORIES[0]; // Small box
  } else if (totalQuantity <= 6) {
    return BOX_CATEGORIES[1]; // Medium box
  } else {
    return BOX_CATEGORIES[2]; // MPS required
  }
}

/**
 * Select appropriate box based on product weight (legacy method)
 */
export function selectBoxForWeight(
  totalProductWeightGrams: number,
): BoxCategory {
  for (const box of BOX_CATEGORIES) {
    if (totalProductWeightGrams <= box.maxWeightGrams) {
      return box;
    }
  }
  return BOX_CATEGORIES[BOX_CATEGORIES.length - 1]; // Default to MPS
}

/**
 * Calculate shipment weight (product weight + packaging overhead)
 */
export function calculateShipmentWeight(productWeightGrams: number): number {
  const box = selectBoxForWeight(productWeightGrams);
  return productWeightGrams + box.overheadWeightGrams;
}
