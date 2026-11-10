import { updateRecipe } from '../src/database/storage';
import type { SQLiteDatabase } from 'expo-sqlite';

describe('updateRecipe', () => {
  function createDatabaseMock() {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const db = {
      withTransactionAsync: jest.fn(async (work: () => Promise<void>) => work()),
      runAsync: jest.fn(async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      }),
      getFirstAsync: jest.fn(async () => ({ id: 'ingredient-id' })),
    } as unknown as SQLiteDatabase;

    return { db, calls };
  }

  it('replaces recipe details, ingredients and steps in one transaction', async () => {
    const { db, calls } = createDatabaseMock();

    await updateRecipe(db, 'recipe-id', {
      title: 'Updated pasta',
      description: 'A new description',
      servings: 3,
      ingredients: [{ name: 'Tomato', quantity: 2, unit: 'item' }],
      steps: ['Chop the tomato'],
    });

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(calls.some(({ sql }) => sql.includes('UPDATE recipes'))).toBe(true);
    expect(calls.some(({ sql }) => sql.includes('DELETE FROM recipe_ingredients'))).toBe(true);
    expect(calls.some(({ sql }) => sql.includes('DELETE FROM recipe_steps'))).toBe(true);
    expect(calls.some(({ sql }) => sql.includes('INSERT INTO recipe_ingredients'))).toBe(true);
    expect(calls.some(({ sql }) => sql.includes('INSERT INTO recipe_steps'))).toBe(true);
  });

  it('rejects an empty recipe title before writing to the database', async () => {
    const { db } = createDatabaseMock();

    await expect(updateRecipe(db, 'recipe-id', {
      title: ' ',
      servings: 2,
      ingredients: [],
      steps: [],
    })).rejects.toThrow('Enter a recipe name and positive serving count.');

    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });
});
