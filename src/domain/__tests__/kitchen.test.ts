/// <reference types="jest" />

import {
  calculateLowStock,
  convertCompatibleQuantity,
  getLowStockItems,
  scaleRecipeIngredients,
} from '../kitchen';

describe('kitchen domain rules', () => {
  it('calculates only positive low-stock shortfalls', () => {
    expect(calculateLowStock(2, 5)).toBe(3);
    expect(calculateLowStock(5, 5)).toBe(0);
    expect(calculateLowStock(8, 5)).toBe(0);
  });

  it('rejects invalid stock quantities', () => {
    expect(() => calculateLowStock(-1, 2)).toThrow();
    expect(() => calculateLowStock(1, Number.NaN)).toThrow();
  });

  it('filters ingredients that are already above minimum stock', () => {
    const items = [
      {
        id: 'rice',
        name: 'Rice',
        quantity: 1,
        minimumQuantity: 3,
        unit: 'kg',
        category: 'Pantry',
      },
      {
        id: 'salt',
        name: 'Salt',
        quantity: 2,
        minimumQuantity: 1,
        unit: 'kg',
        category: 'Pantry',
      },
    ];

    expect(getLowStockItems(items)).toMatchObject([
      { id: 'rice', neededQuantity: 2 },
    ]);
  });

  it('scales servings without mutating the saved recipe', () => {
    const ingredients = [
      { name: 'Flour', quantity: 200, unit: 'g' },
    ];

    expect(scaleRecipeIngredients(ingredients, 2, 4)[0].quantity).toBe(400);
    expect(ingredients[0].quantity).toBe(200);
  });

  it('converts only compatible measurement units', () => {
    expect(convertCompatibleQuantity(1, 'kg', 'g')).toBe(1000);
    expect(convertCompatibleQuantity(1, 'l', 'ml')).toBe(1000);
    expect(convertCompatibleQuantity(1, 'kg', 'ml')).toBeNull();
  });
});
