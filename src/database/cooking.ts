import type { SQLiteDatabase } from 'expo-sqlite';
import { buildCookingLine } from '@/domain/cooking';

export type CookingLine = {
  ingredientId: string;
  name: string;
  requestedQuantity: number;
  recipeUnit: string;
  inventoryId: string | null;
  availableQuantity: number | null;
  inventoryUnit: string | null;
  deductQuantity: number;
  shortage: number;
  status: 'ready' | 'shortage' | 'untracked' | 'incompatible';
};

export type CookingPreview = {
  recipeId: string;
  recipeTitle: string;
  servings: number;
  lines: CookingLine[];
};

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export async function previewCooking(
  db: SQLiteDatabase,
  recipeId: string,
  servings: number,
): Promise<CookingPreview> {
  if (!Number.isInteger(servings) || servings < 1) {
    throw new Error('Servings must be a positive whole number.');
  }

  const recipe = await db.getFirstAsync<{
    id: string;
    title: string;
    default_servings: number;
  }>(
    'SELECT id, title, default_servings FROM recipes WHERE id = ?',
    recipeId,
  );

  if (!recipe) {
    throw new Error('Recipe was not found.');
  }

  const rows = await db.getAllAsync<{
    ingredient_id: string;
    name: string;
    quantity: number;
    unit_code: string;
    inventory_id: string | null;
    available: number | null;
    inventory_unit: string | null;
  }>(
    `SELECT
      i.id AS ingredient_id,
      i.name,
      ri.quantity,
      ri.unit_code,
      v.id AS inventory_id,
      v.quantity AS available,
      v.unit_code AS inventory_unit
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    LEFT JOIN inventory v ON v.ingredient_id = i.id
    WHERE ri.recipe_id = ?
    ORDER BY ri.sort_order`,
    recipeId,
  );

  const servingFactor = servings / recipe.default_servings;
  const remainingStock = new Map<string, number>();

  const lines: CookingLine[] = rows.map((row) => {
    const availableQuantity =
      row.inventory_id && row.available !== null
        ? remainingStock.get(row.inventory_id) ?? row.available
        : row.available;

    const line = buildCookingLine({
      ingredientId: row.ingredient_id,
      name: row.name,
      requestedQuantity: row.quantity * servingFactor,
      recipeUnit: row.unit_code,
      inventoryId: row.inventory_id,
      availableQuantity,
      inventoryUnit: row.inventory_unit,
    });

    if (row.inventory_id && availableQuantity !== null) {
      remainingStock.set(
        row.inventory_id,
        Math.max(0, availableQuantity - line.deductQuantity),
      );
    }

    return line;
  });

  return {
    recipeId,
    recipeTitle: recipe.title,
    servings,
    lines,
  };
}

export async function confirmCooking(
  db: SQLiteDatabase,
  eventId: string,
  recipeId: string,
  servings: number,
): Promise<{
  historyId: string;
  alreadyApplied: boolean;
  preview: CookingPreview;
}> {
  if (!eventId.trim()) {
    throw new Error('A cooking event identifier is required.');
  }

  let historyId = '';
  let alreadyApplied = false;
  let preview!: CookingPreview;

  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM cooking_history WHERE event_id = ?',
      eventId,
    );

    if (existing) {
      historyId = existing.id;
      alreadyApplied = true;
      preview = await previewCooking(db, recipeId, servings);
      return;
    }

    // Recalculate inside the transaction so the preview uses current stock.
    preview = await previewCooking(db, recipeId, servings);
    historyId = makeId();

    await db.runAsync(
      `INSERT INTO cooking_history (
        id, event_id, recipe_id, recipe_title, servings
      ) VALUES (?, ?, ?, ?, ?)`,
      historyId,
      eventId,
      recipeId,
      preview.recipeTitle,
      servings,
    );

    for (const line of preview.lines) {
      if (
        !line.inventoryId ||
        line.status === 'incompatible' ||
        line.deductQuantity <= 0
      ) {
        continue;
      }

      await db.runAsync(
        `UPDATE inventory
        SET quantity = MAX(0, quantity - ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        line.deductQuantity,
        line.inventoryId,
      );

      await db.runAsync(
        `INSERT INTO cooking_deductions (
          id,
          cooking_history_id,
          ingredient_id,
          requested_quantity,
          deducted_quantity,
          unit_code,
          requested_unit_code,
          deducted_unit_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        makeId(),
        historyId,
        line.ingredientId,
        line.requestedQuantity,
        line.deductQuantity,
        line.inventoryUnit,
        line.recipeUnit,
        line.inventoryUnit,
      );
    }
  });

  return {
    historyId,
    alreadyApplied,
    preview,
  };
}

export async function listCookingHistory(db: SQLiteDatabase) {
  return db.getAllAsync<{
    id: string;
    recipe_title: string;
    servings: number;
    cooked_at: string;
  }>(
    `SELECT id, recipe_title, servings, cooked_at
    FROM cooking_history
    ORDER BY cooked_at DESC`,
  );
}
