import { getLowStockItems } from '../src/domain/kitchen';

describe('automatic shopping list', () => {
  const stock = (quantity: number, minimumQuantity: number) => ({
    id: 'flour',
    name: 'Flour',
    quantity,
    minimumQuantity,
    unit: 'kg',
    category: 'Baking',
  });

  it('adds an item when its stock reaches the minimum threshold', () => {
    expect(getLowStockItems([stock(2, 2)])).toEqual([
      { ...stock(2, 2), neededQuantity: 0 },
    ]);
  });

  it('adds an item when stock is below minimum and excludes stock above it', () => {
    expect(getLowStockItems([stock(1, 2), stock(4, 2)])).toEqual([
      { ...stock(1, 2), neededQuantity: 1 },
    ]);
  });
});
