/// <reference types="jest" />

import { buildCookingLine } from '../cooking';

const trackedIngredient = {
  ingredientId: 'flour',
  name: 'Flour',
  requestedQuantity: 200,
  recipeUnit: 'g',
  inventoryId: 'stock-1',
  availableQuantity: 500,
  inventoryUnit: 'g',
};

describe('cooking deduction preview', () => {
  it('previews the full deduction when stock is sufficient', () => {
    expect(buildCookingLine(trackedIngredient)).toMatchObject({
      deductQuantity: 200,
      shortage: 0,
      status: 'ready',
    });
  });

  it('caps deductions at available stock and reports the shortage', () => {
    expect(
      buildCookingLine({
        ...trackedIngredient,
        availableQuantity: 75,
      }),
    ).toMatchObject({
      deductQuantity: 75,
      shortage: 125,
      status: 'shortage',
    });
  });

  it('does not deduct ingredients that are not tracked', () => {
    expect(
      buildCookingLine({
        ...trackedIngredient,
        inventoryId: null,
        availableQuantity: null,
        inventoryUnit: null,
      }),
    ).toMatchObject({
      deductQuantity: 0,
      status: 'untracked',
    });
  });

  it('does not guess incompatible measurement units', () => {
    expect(
      buildCookingLine({
        ...trackedIngredient,
        recipeUnit: 'kg',
        inventoryUnit: 'ml',
      }),
    ).toMatchObject({
      deductQuantity: 0,
      status: 'incompatible',
    });
  });

  it('shares available stock across repeated ingredient rows', () => {
    const firstLine = buildCookingLine({
      ...trackedIngredient,
      availableQuantity: 300,
    });
    const secondLine = buildCookingLine({
      ...trackedIngredient,
      availableQuantity: 300 - firstLine.deductQuantity,
    });

    expect(firstLine.deductQuantity + secondLine.deductQuantity).toBe(300);
    expect(secondLine.shortage).toBe(100);
  });

  it('never creates a negative stock deduction', () => {
    expect(
      buildCookingLine({
        ...trackedIngredient,
        availableQuantity: 0,
      }),
    ).toMatchObject({
      deductQuantity: 0,
      shortage: 200,
    });
  });
});
