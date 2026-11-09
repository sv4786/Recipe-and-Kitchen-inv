import type { SQLiteDatabase } from 'expo-sqlite';
import { convertCompatibleQuantity } from '@/domain/kitchen';

const initialSchema = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('recipe', 'ingredient', 'shared')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_uri TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  prep_minutes INTEGER NOT NULL DEFAULT 0 CHECK (prep_minutes >= 0),
  cook_minutes INTEGER NOT NULL DEFAULT 0 CHECK (cook_minutes >= 0),
  default_servings INTEGER NOT NULL CHECK (default_servings > 0),
  is_favourite INTEGER NOT NULL DEFAULT 0 CHECK (is_favourite IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity REAL NOT NULL CHECK (quantity >= 0),
  unit_code TEXT NOT NULL,
  display_note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  instruction TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  ingredient_id TEXT NOT NULL UNIQUE REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_code TEXT NOT NULL,
  minimum_quantity REAL NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  location TEXT,
  expiry_date TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ingredient_id TEXT REFERENCES ingredients(id) ON DELETE SET NULL,
  quantity REAL CHECK (quantity IS NULL OR quantity >= 0),
  unit_code TEXT,
  notes TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cooking_history (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
  recipe_title TEXT NOT NULL,
  servings INTEGER NOT NULL CHECK (servings > 0),
  cooked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cooking_deductions (
  id TEXT PRIMARY KEY,
  cooking_history_id TEXT NOT NULL REFERENCES cooking_history(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  requested_quantity REAL NOT NULL CHECK (requested_quantity >= 0),
  deducted_quantity REAL NOT NULL CHECK (deducted_quantity >= 0),
  unit_code TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recipes_title
  ON recipes(title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe
  ON recipe_ingredients(recipe_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe
  ON recipe_steps(recipe_id, sort_order);
`;

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeName = (name: string) => name.trim().toLocaleLowerCase();

export async function initializeDatabase(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const currentVersion = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version;',
  );

  if ((currentVersion?.user_version ?? 0) < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(initialSchema);
      await db.execAsync('PRAGMA user_version = 1;');
    });
  }

  const latestVersion = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version;',
  );

  if ((latestVersion?.user_version ?? 0) < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(
        "ALTER TABLE cooking_deductions ADD COLUMN requested_unit_code TEXT NOT NULL DEFAULT 'item';",
      );
      await db.execAsync(
        "ALTER TABLE cooking_deductions ADD COLUMN deducted_unit_code TEXT NOT NULL DEFAULT 'item';",
      );
      await db.execAsync(
        'UPDATE cooking_deductions SET requested_unit_code = unit_code, deducted_unit_code = unit_code;',
      );
      await db.execAsync('PRAGMA user_version = 2;');
    });
  }

  const foreignKeys = await db.getFirstAsync<{ foreign_keys: number }>(
    'PRAGMA foreign_keys;',
  );

  if (foreignKeys?.foreign_keys !== 1) {
    throw new Error('SQLite foreign-key enforcement could not be enabled.');
  }
}

export type RecipeIngredientInput = {
  name: string;
  quantity: number;
  unit: string;
};

export type RecipeInput = {
  title: string;
  description?: string;
  servings: number;
  ingredients?: RecipeIngredientInput[];
  steps?: string[];
};

export async function addRecipe(
  db: SQLiteDatabase,
  input: RecipeInput,
): Promise<string> {
  const title = input.title.trim();

  if (!title || !Number.isInteger(input.servings) || input.servings < 1) {
    throw new Error('Enter a recipe name and positive serving count.');
  }

  const recipeId = makeId();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO recipes (
        id, title, description, default_servings
      ) VALUES (?, ?, ?, ?)`,
      recipeId,
      title,
      input.description?.trim() ?? null,
      input.servings,
    );

    for (const [sortOrder, ingredient] of (
      input.ingredients ?? []
    ).entries()) {
      const name = ingredient.name.trim();

      if (
        !name ||
        !Number.isFinite(ingredient.quantity) ||
        ingredient.quantity < 0 ||
        !ingredient.unit.trim()
      ) {
        throw new Error('Check each ingredient name, quantity and unit.');
      }

      await db.runAsync(
        `INSERT OR IGNORE INTO ingredients (
          id, name, normalized_name
        ) VALUES (?, ?, ?)`,
        makeId(),
        name,
        normalizeName(name),
      );

      const savedIngredient = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM ingredients WHERE normalized_name = ?',
        normalizeName(name),
      );

      if (!savedIngredient) {
        throw new Error('Could not save ingredient.');
      }

      await db.runAsync(
        `INSERT INTO recipe_ingredients (
          id, recipe_id, ingredient_id, quantity, unit_code, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        makeId(),
        recipeId,
        savedIngredient.id,
        ingredient.quantity,
        ingredient.unit.trim().toLocaleLowerCase(),
        sortOrder,
      );
    }

    for (const [sortOrder, instruction] of (input.steps ?? []).entries()) {
      if (!instruction.trim()) {
        continue;
      }

      await db.runAsync(
        `INSERT INTO recipe_steps (
          id, recipe_id, instruction, sort_order
        ) VALUES (?, ?, ?, ?)`,
        makeId(),
        recipeId,
        instruction.trim(),
        sortOrder,
      );
    }
  });

  return recipeId;
}

export async function searchRecipes(db: SQLiteDatabase, query = '') {
  const searchTerm = `%${query.trim()}%`;

  return db.getAllAsync<{
    id: string;
    title: string;
    description: string | null;
    default_servings: number;
  }>(
    `SELECT DISTINCT
      recipes.id,
      recipes.title,
      recipes.description,
      recipes.default_servings
    FROM recipes
    LEFT JOIN recipe_ingredients
      ON recipe_ingredients.recipe_id = recipes.id
    LEFT JOIN ingredients
      ON ingredients.id = recipe_ingredients.ingredient_id
    WHERE recipes.title LIKE ? COLLATE NOCASE
      OR ingredients.name LIKE ? COLLATE NOCASE
    ORDER BY recipes.updated_at DESC, recipes.title COLLATE NOCASE`,
    searchTerm,
    searchTerm,
  );
}

export async function listInventory(db: SQLiteDatabase) {
  return db.getAllAsync<{
    id: string;
    name: string;
    quantity: number;
    minimum_quantity: number;
    unit_code: string;
    category: string;
  }>(
    `SELECT
      inventory.id,
      ingredients.name,
      inventory.quantity,
      inventory.minimum_quantity,
      inventory.unit_code,
      COALESCE(categories.name, 'Other') AS category
    FROM inventory
    JOIN ingredients ON ingredients.id = inventory.ingredient_id
    LEFT JOIN categories ON categories.id = ingredients.category_id
    ORDER BY ingredients.name COLLATE NOCASE`,
  );
}

export async function saveInventory(
  db: SQLiteDatabase,
  input: {
    name: string;
    quantity: number;
    minimum: number;
    unit: string;
  },
): Promise<void> {
  const name = input.name.trim();

  if (
    !name ||
    !input.unit.trim() ||
    ![input.quantity, input.minimum].every(Number.isFinite) ||
    input.quantity < 0 ||
    input.minimum < 0
  ) {
    throw new Error('Enter a name and valid non-negative quantities.');
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR IGNORE INTO ingredients (
        id, name, normalized_name
      ) VALUES (?, ?, ?)`,
      makeId(),
      name,
      normalizeName(name),
    );

    const ingredient = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM ingredients WHERE normalized_name = ?',
      normalizeName(name),
    );

    if (!ingredient) {
      throw new Error('Could not save ingredient.');
    }

    await db.runAsync(
      `INSERT INTO inventory (
        id, ingredient_id, quantity, unit_code, minimum_quantity
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(ingredient_id) DO UPDATE SET
        quantity = excluded.quantity,
        unit_code = excluded.unit_code,
        minimum_quantity = excluded.minimum_quantity,
        updated_at = CURRENT_TIMESTAMP`,
      makeId(),
      ingredient.id,
      input.quantity,
      input.unit.trim().toLocaleLowerCase(),
      input.minimum,
    );
  });
}

export async function changeStock(
  db: SQLiteDatabase,
  inventoryId: string,
  delta: number,
): Promise<void> {
  if (!Number.isFinite(delta)) {
    throw new Error('Enter a valid stock adjustment.');
  }

  await db.runAsync(
    `UPDATE inventory
    SET quantity = MAX(0, quantity + ?),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    delta,
    inventoryId,
  );
}

export async function manualItems(db: SQLiteDatabase) {
  return db.getAllAsync<{
    id: string;
    name: string;
    is_completed: number;
  }>(
    `SELECT id, name, is_completed
    FROM shopping_items
    ORDER BY is_completed, created_at DESC`,
  );
}

export async function addManualItem(
  db: SQLiteDatabase,
  name: string,
): Promise<void> {
  if (!name.trim()) {
    throw new Error('Enter an item name.');
  }

  await db.runAsync(
    'INSERT INTO shopping_items (id, name) VALUES (?, ?)',
    makeId(),
    name.trim(),
  );
}

export async function toggleManualItem(
  db: SQLiteDatabase,
  itemId: string,
  completed: boolean,
): Promise<void> {
  await db.runAsync(
    'UPDATE shopping_items SET is_completed = ? WHERE id = ?',
    completed ? 1 : 0,
    itemId,
  );
}

export async function recordIngredientPurchase(
  db: SQLiteDatabase,
  inventoryId: string,
  purchasedQuantity: number,
  purchasedUnit: string,
): Promise<void> {
  if (!Number.isFinite(purchasedQuantity) || purchasedQuantity <= 0) {
    throw new Error('Enter the actual quantity purchased.');
  }

  await db.withTransactionAsync(async () => {
    const item = await db.getFirstAsync<{
      quantity: number;
      unit_code: string;
    }>(
      'SELECT quantity, unit_code FROM inventory WHERE id = ?',
      inventoryId,
    );

    if (!item) {
      throw new Error('Inventory item was not found.');
    }

    const convertedQuantity = convertCompatibleQuantity(
      purchasedQuantity,
      purchasedUnit,
      item.unit_code,
    );

    if (convertedQuantity === null) {
      throw new Error(
        'The purchase unit is not compatible with the inventory unit.',
      );
    }

    await db.runAsync(
      `UPDATE inventory
      SET quantity = quantity + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      convertedQuantity,
      inventoryId,
    );
  });
}

export async function recipeForDetail(
  db: SQLiteDatabase,
  recipeId: string,
) {
  const recipe = await db.getFirstAsync<{
    id: string;
    title: string;
    description: string | null;
    default_servings: number;
  }>(
    'SELECT id, title, description, default_servings FROM recipes WHERE id = ?',
    recipeId,
  );

  if (!recipe) {
    return null;
  }

  const ingredients = await db.getAllAsync<{
    name: string;
    quantity: number;
    unit_code: string;
  }>(
    `SELECT ingredients.name, recipe_ingredients.quantity, recipe_ingredients.unit_code
    FROM recipe_ingredients
    JOIN ingredients ON ingredients.id = recipe_ingredients.ingredient_id
    WHERE recipe_ingredients.recipe_id = ?
    ORDER BY recipe_ingredients.sort_order`,
    recipeId,
  );

  const steps = await db.getAllAsync<{ instruction: string }>(
    `SELECT instruction
    FROM recipe_steps
    WHERE recipe_id = ?
    ORDER BY sort_order`,
    recipeId,
  );

  return {
    ...recipe,
    ingredients,
    steps,
  };
}
