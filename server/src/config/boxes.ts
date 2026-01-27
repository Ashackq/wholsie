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
    name: "Small Box",
    maxWeightGrams: 500,
    dimensionsCm: { length: 20, breadth: 15, height: 10 },
    overheadWeightGrams: 30,
  },
  {
    id: "box-m",
    name: "Medium Box",
    maxWeightGrams: 1000,
    dimensionsCm: { length: 30, breadth: 20, height: 15 },
    overheadWeightGrams: 40,
  },
  {
    id: "box-l",
    name: "Large Box",
    maxWeightGrams: Number.MAX_SAFE_INTEGER,
    dimensionsCm: { length: 40, breadth: 30, height: 20 },
    overheadWeightGrams: 50,
  },
];

/**
 * Select appropriate box based on product weight
 */
export function selectBoxForWeight(
  totalProductWeightGrams: number,
): BoxCategory {
  for (const box of BOX_CATEGORIES) {
    if (totalProductWeightGrams <= box.maxWeightGrams) {
      return box;
    }
  }
  return BOX_CATEGORIES[BOX_CATEGORIES.length - 1]; // Default to largest
}

/**
 * Calculate shipment weight (product weight + packaging overhead)
 */
export function calculateShipmentWeight(productWeightGrams: number): number {
  const box = selectBoxForWeight(productWeightGrams);
  return productWeightGrams + box.overheadWeightGrams;
}
