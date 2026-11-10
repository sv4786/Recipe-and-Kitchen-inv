export type StockLevel = {
  id: string;
  name: string;
  quantity: number;
  minimumQuantity: number;
  unit: string;
  category: string;
};

export function calculateLowStock(
  currentQuantity: number,
  minimumQuantity: number,
): number {
  if (
    !Number.isFinite(currentQuantity) ||
    !Number.isFinite(minimumQuantity) ||
    currentQuantity < 0 ||
    minimumQuantity < 0
  ) {
    throw new Error('Stock quantities must be finite, non-negative numbers.');
  }

  return Math.max(0, minimumQuantity - currentQuantity);
}

export function getLowStockItems<T extends StockLevel>(
  items: T[],
): Array<T & { neededQuantity: number }> {
  return items.flatMap((item) => {
    const neededQuantity = calculateLowStock(
      item.quantity,
      item.minimumQuantity,
    );

    return neededQuantity >= 0 && item.quantity <= item.minimumQuantity
      ? [{ ...item, neededQuantity }]
      : [];
  });
}

export type RecipeQuantity = {
  quantity: number;
  unit: string;
  name: string;
};

export function scaleRecipeIngredients<T extends RecipeQuantity>(
  ingredients: T[],
  sourceServings: number,
  targetServings: number,
): T[] {
  if (
    !Number.isInteger(sourceServings) ||
    sourceServings <= 0 ||
    !Number.isInteger(targetServings) ||
    targetServings <= 0
  ) {
    throw new Error('Serving counts must be positive whole numbers.');
  }

  const factor = targetServings / sourceServings;

  return ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.quantity * factor,
  }));
}

const units: Record<string, { dimension: string; factor: number }> = {
  g: { dimension: 'mass', factor: 1 },
  kg: { dimension: 'mass', factor: 1000 },
  ml: { dimension: 'volume', factor: 1 },
  l: { dimension: 'volume', factor: 1000 },
  tsp: { dimension: 'volume', factor: 5 },
  tbsp: { dimension: 'volume', factor: 15 },
  cup: { dimension: 'volume', factor: 240 },
  item: { dimension: 'count', factor: 1 },
};

export function convertCompatibleQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number | null {
  if (!Number.isFinite(quantity) || quantity < 0) {
    return null;
  }

  if (fromUnit === toUnit) {
    return quantity;
  }

  const from = units[fromUnit];
  const to = units[toUnit];

  if (!from || !to || from.dimension !== to.dimension) {
    return null;
  }

  return (quantity * from.factor) / to.factor;
}
