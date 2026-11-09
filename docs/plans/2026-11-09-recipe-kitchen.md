# Recipe & Kitchen Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-first Android recipe book, kitchen inventory, and automatic shopping list in the currently empty Recipe-and-Kitchen-inv repository.

**Architecture:** Use Expo React Native with TypeScript and Expo Router. Keep business rules pure and independently tested, persist app data in SQLite through repository modules, and compose shopping needs from current inventory rather than duplicating generated rows. Cooking deductions and purchase updates are transactional.

**Tech Stack:** Expo React Native, TypeScript, Expo Router, Expo SQLite, Zod, Expo Image Picker, Expo FileSystem/document picker/sharing as supported by the selected Expo SDK, Jest with jest-expo, and React Native Testing Library.

## Global Constraints

- Android only; one household on one device.
- All core recipe, inventory, cooking, and shopping workflows work offline.
- No backend, authentication, cloud sync, or paid API dependency.
- Recipe cooking displays scaled deductions and requires explicit confirmation.
- Cancelling cooking confirmation makes no inventory changes.
- Confirmed cooking deductions are atomic, idempotent, and never make stock negative.
- Incompatible units are never converted by guessing; mass-to-volume conversion requires ingredient-specific density data, which is out of scope.
- Shopping needs are derived from inventory and minimum-stock quantities; generated items must not be persisted as duplicate rows.
- Manual shopping items remain independent of inventory unless the user explicitly links a purchase to a tracked ingredient.
- Purchased quantities are entered by the user; never assume the suggested amount was bought.
- Preserve recipe meaning when deleting ingredients; prevent destructive deletion while referenced or require an explicit replacement/removal action.
- Use accessible labels, readable typography, large touch targets, and text/icon indicators in addition to colour.
- Store photos in app-managed file storage, not as large SQLite blobs.
- Provide user-initiated backup and restore. Validate backups before replacement, require confirmation, and preserve a recoverable pre-restore backup where practical.
- Use versioned SQLite migrations and enable foreign-key enforcement.
- Use TDD: every new business behaviour starts with a focused failing test; run focused tests, then affected integration checks.
- Repository was observed empty apart from the approved design specification under docs/specs. All source paths below are proposed, not existing conventions.
- At implementation start, inspect the current stable Expo SDK compatibility matrix and install compatible package versions. Do not hardcode unverified package versions.

---

### Task 1: Bootstrap the Android Expo application and test harness

**Files:**
- Create: `package.json`
- Create: `app.json`
- Create: `tsconfig.json`
- Create: `babel.config.js` (only if required by selected Expo/Jest setup)
- Create: `jest.config.js`
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx`
- Create: `app/(tabs)/recipes.tsx`
- Create: `app/(tabs)/inventory.tsx`
- Create: `app/(tabs)/shopping.tsx`
- Create: `src/theme/` with design tokens and typed theme exports
- Create: `src/components/` with reusable screen, button, empty-state, and form-field primitives
- Create: `src/domain/__tests__/smoke.test.ts`
- Create: `README.md`

**Interfaces:**
- Produces Expo Router routes for Home, Recipes, Inventory, and Shopping.
- Produces `src/theme/tokens.ts` exports for colours, spacing, typography, and radii.
- Produces a working Jest command and React Native Testing Library setup.
- Produces a typed app shell that later feature modules can consume.

- [ ] **Step 1: Add the focused failing test**

Create a smoke test asserting that the app's design tokens expose the required primary/secondary/background colours and that a shared empty-state component can render a title and supporting text.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --runInBand src/domain/__tests__/smoke.test.ts`

Expected: Jest reports the missing token/component exports before implementation.

- [ ] **Step 3: Implement the minimum behavior**

Inspect the current stable Expo SDK and use its documented compatible package set. Configure TypeScript, Expo Router, Android app metadata, Jest, and React Native Testing Library. Create the four tab routes with usable empty states and the warm cream/forest-green/sage visual system. Keep screen-specific business logic out of the route files.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --runInBand src/domain/__tests__/smoke.test.ts`

Expected: The smoke test passes and the app shell renders without missing-module errors.

- [ ] **Step 5: Run the affected integration check**

Run: `npx expo-doctor` and `npx expo export --platform android`

Expected: Expo dependency/configuration checks pass and an Android bundle export completes.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add package.json app.json tsconfig.json babel.config.js jest.config.js app src/theme src/components src/domain/__tests__/smoke.test.ts README.md
git commit -m "feat: bootstrap Recipe and Kitchen Android app"
```

### Task 2: Implement SQLite schema, migrations, and repository boundaries

**Files:**
- Create: `src/database/client.ts`
- Create: `src/database/migrations/index.ts`
- Create: `src/database/migrations/001_initial_schema.ts`
- Create: `src/database/repositories/recipeRepository.ts`
- Create: `src/database/repositories/ingredientRepository.ts`
- Create: `src/database/repositories/inventoryRepository.ts`
- Create: `src/database/repositories/shoppingRepository.ts`
- Create: `src/database/repositories/cookingRepository.ts`
- Create: `src/types/entities.ts`
- Create: `src/database/__tests__/migrations.test.ts`
- Create: `src/database/__tests__/repositories.test.ts`

**Interfaces:**
- `openAppDatabase(): Promise<SQLiteDatabase>`
- `runMigrations(db: SQLiteDatabase): Promise<void>`
- Recipe repository: `createRecipe`, `updateRecipe`, `getRecipeById`, `searchRecipes`, `listRecipes`, `deleteRecipe`.
- Ingredient repository: `createIngredient`, `getIngredientById`, `searchIngredients`, `deleteIngredient`.
- Inventory repository: `upsertInventoryStock`, `getInventoryItem`, `listInventory`, `adjustInventoryStock`.
- Shopping repository: `createManualShoppingItem`, `updateManualShoppingItem`, `deleteManualShoppingItem`, `listManualShoppingItems`.
- Cooking repository: transaction boundary for later confirmed cooking events.
- All repositories accept or close over the same database instance; UI components never issue SQL directly.

- [ ] **Step 1: Add the focused failing test**

Write migration tests for all required tables, foreign-key enforcement, unique inventory-per-ingredient, and schema version. Write repository tests proving recipe rows and ordered child rows persist across database reopen, and ingredient deletion is rejected while referenced by a recipe.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --runInBand src/database/__tests__`

Expected: Tests fail because the database client, schema, and repositories do not exist.

- [ ] **Step 3: Implement the minimum behavior**

Create versioned migrations for recipes, ingredients, recipe_ingredients, recipe_steps, inventory, categories, shopping_items (manual entries only), cooking_history, and cooking_deductions. Enable foreign keys on every opened connection. Add indexes for recipe title, normalized ingredient name, and foreign-key lookup columns. Use stable local IDs, explicit deletion policies, parameterised SQL, and transactions for multi-row recipe writes. Validate persisted quantity inputs against negative and non-finite values at repository boundaries.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --runInBand src/database/__tests__`

Expected: Migration and repository tests pass against isolated SQLite databases.

- [ ] **Step 5: Run the affected integration check**

Run: `npm test -- --runInBand`

Expected: All existing app-shell and database tests pass together.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/database src/types
git commit -m "feat: add local SQLite data layer"
```

### Task 3: Deliver recipe management, ingredient catalogue, search, and serving scaling

**Files:**
- Create: `src/domain/units.ts`
- Create: `src/domain/recipeScaling.ts`
- Create: `src/features/recipes/recipeSchemas.ts`
- Create: `src/features/recipes/recipeService.ts`
- Create: `src/features/recipes/components/RecipeCard.tsx`
- Create: `src/features/recipes/components/RecipeForm.tsx`
- Create: `src/features/recipes/components/RecipeIngredientEditor.tsx`
- Create: `src/features/recipes/components/RecipeStepEditor.tsx`
- Create: `src/features/recipes/screens/RecipeListScreen.tsx`
- Create: `src/features/recipes/screens/RecipeDetailScreen.tsx`
- Create: `src/features/recipes/screens/RecipeEditScreen.tsx`
- Modify: `app/(tabs)/recipes.tsx`
- Create: `src/features/recipes/__tests__/recipeScaling.test.ts`
- Create: `src/features/recipes/__tests__/recipeService.test.ts`

**Interfaces:**
- `scaleRecipeIngredients(ingredients, sourceServings, targetServings): ScaledRecipeIngredient[]`
- `convertCompatibleQuantity(quantity, fromUnit, toUnit): number | null`
- `saveRecipe(input): Promise<Recipe>`
- `findRecipes(query, filters): Promise<Recipe[]>`
- Recipe screens consume service functions and typed domain entities, never SQL.

- [ ] **Step 1: Add the focused failing test**

Test proportional ingredient scaling for increased/decreased servings, decimal quantities, invalid serving counts, mass-to-mass conversions, volume-to-volume conversions, count units, and rejected mass-to-volume conversion. Add recipe-service tests for create/edit/search/favourite and preserving instruction/ingredient ordering.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --runInBand src/features/recipes/__tests__`

Expected: Tests fail because scaling and recipe services are not implemented.

- [ ] **Step 3: Implement the minimum behavior**

Implement canonical unit codes and only dimensionally valid conversions. Build Zod-backed recipe forms, canonical ingredient selection/creation, optional local image selection, ordered instruction editing, favourites, category filtering, and title/ingredient search. Recipe serving scaling is a read-only calculation; never overwrite stored recipe quantities when the displayed serving count changes. Prevent deletion of ingredients still referenced by recipes unless the user explicitly resolves those references.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --runInBand src/features/recipes/__tests__`

Expected: Scaling, conversion, and recipe service tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `npm test -- --runInBand` and `npx expo export --platform android`

Expected: All tests pass and the recipe routes are included in the Android bundle.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/domain src/features/recipes app
git commit -m "feat: add searchable recipe book"
```

### Task 4: Deliver kitchen inventory and automatic/manual shopping list

**Files:**
- Create: `src/domain/lowStock.ts`
- Create: `src/features/inventory/inventorySchemas.ts`
- Create: `src/features/inventory/inventoryService.ts`
- Create: `src/features/inventory/screens/InventoryScreen.tsx`
- Create: `src/features/inventory/components/InventoryItemForm.tsx`
- Create: `src/features/inventory/components/StockAdjuster.tsx`
- Create: `src/features/shopping/shoppingService.ts`
- Create: `src/features/shopping/screens/ShoppingScreen.tsx`
- Create: `src/features/shopping/components/ShoppingItemRow.tsx`
- Create: `src/features/shopping/components/PurchaseQuantityDialog.tsx`
- Modify: `app/(tabs)/inventory.tsx`
- Modify: `app/(tabs)/shopping.tsx`
- Modify: `app/(tabs)/index.tsx`
- Create: `src/features/inventory/__tests__/inventoryService.test.ts`
- Create: `src/features/shopping/__tests__/shoppingService.test.ts`
- Create: `src/domain/__tests__/lowStock.test.ts`

**Interfaces:**
- `calculateLowStock(currentQuantity, minimumQuantity): number`
- `getShoppingList(): Promise<{ automatic: NeededIngredient[]; manual: ManualShoppingItem[] }>`
- `recordIngredientPurchase(ingredientId, purchasedQuantity, unitCode): Promise<InventoryItem>`
- `addManualShoppingItem(input): Promise<ManualShoppingItem>`
- `completeManualShoppingItem(id): Promise<void>`
- `adjustInventory(ingredientId, delta, unitCode): Promise<InventoryItem>`

- [ ] **Step 1: Add the focused failing test**

Test low-stock boundaries (below, equal, above minimum), repeated list reads without duplicate generated rows, manual item independence, purchase of the suggested amount, purchase of a different actual amount, partial restocking that leaves a shortfall, incompatible purchase units, and rollback when a purchase write fails.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --runInBand src/domain/__tests__/lowStock.test.ts src/features/inventory/__tests__ src/features/shopping/__tests__`

Expected: Tests fail because inventory, low-stock calculation, and shopping services are not yet present.

- [ ] **Step 3: Implement the minimum behavior**

Implement inventory CRUD, stock adjustments, category/location/expiry filters, and minimum thresholds. Derive automatic shopping items from inventory at read time; do not persist generated rows. Persist manual shopping items separately. When purchasing an automatic item, validate a positive compatible quantity and add the actual entered amount to stock in one transaction, then derive the remaining shortfall. Completing a manual item must not alter inventory. Update dashboard counts from the same services.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --runInBand src/domain/__tests__/lowStock.test.ts src/features/inventory/__tests__ src/features/shopping/__tests__`

Expected: All low-stock, inventory, and shopping tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `npm test -- --runInBand` and `npx expo export --platform android`

Expected: The entire test suite passes and inventory/shopping routes bundle successfully.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/domain src/features/inventory src/features/shopping app
git commit -m "feat: add kitchen inventory and automatic shopping list"
```

### Task 5: Deliver confirmed cooking deductions, history, backup/restore, and release verification

**Files:**
- Create: `src/features/cooking/cookingService.ts`
- Create: `src/features/cooking/screens/CookingConfirmationScreen.tsx`
- Create: `src/features/cooking/screens/CookingHistoryScreen.tsx`
- Create: `src/features/cooking/components/DeductionPreview.tsx`
- Create: `src/features/cooking/__tests__/cookingService.test.ts`
- Create: `src/services/backup/backupService.ts`
- Create: `src/services/backup/backupSchemas.ts`
- Create: `src/services/backup/__tests__/backupService.test.ts`
- Create: `src/services/images/imageStorage.ts`
- Create: `src/features/settings/SettingsScreen.tsx`
- Create: `app/recipe/[id].tsx`
- Create: `app/recipe/[id]/cook.tsx`
- Create: `app/settings.tsx`
- Modify: `app/_layout.tsx`
- Modify: `README.md`

**Interfaces:**
- `previewCookingDeductions(recipeId, servings): Promise<CookingDeductionPreview>`
- `confirmCooking(eventId, recipeId, servings): Promise<CookingHistoryEntry>`
- `getCookingHistory(): Promise<CookingHistoryEntry[]>`
- `createBackup(): Promise<BackupArtifact>`
- `validateBackup(uri): Promise<ValidatedBackup>`
- `restoreBackup(validatedBackup): Promise<void>`
- `storeImage(sourceUri): Promise<string>`

- [ ] **Step 1: Add the focused failing test**

Test deduction preview with sufficient, insufficient, missing, and incompatible inventory; cancellation with no writes; confirmation with exact scaled deductions; no negative stock; repeated event ID applied at most once; atomic rollback when one deduction fails; and history contents. Test backup round-trip of database data and image references, invalid/corrupt backup rejection, and restore failure preserving the current database.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --runInBand src/features/cooking/__tests__ src/services/backup/__tests__`

Expected: Tests fail because cooking and backup services are not implemented.

- [ ] **Step 3: Implement the minimum behavior**

Build the cooking preview from the chosen serving count and canonical inventory matches. Show untracked ingredients and unit incompatibilities clearly. For insufficient stock, show the requested amount and shortage; on confirmation deduct no more than available stock, record requested and actual deducted quantities, and never allow negative balances. Require a unique event ID and write history plus all deductions in a single transaction. The UI must make no write until the user confirms.

Implement user-initiated backup/restore using a documented portable archive containing a validated database export and referenced local images. Use the Expo SDK's compatible file/document/share APIs and an archive library only after verifying compatibility. Validate schema/version and referenced media before restore; require explicit confirmation and preserve a recoverable pre-restore backup when practical. Keep image files in app-managed storage and display placeholders for missing files. Add settings actions for backup and restore and document the process.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --runInBand src/features/cooking/__tests__ src/services/backup/__tests__`

Expected: Cooking transaction/idempotency and backup safety tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `npm test -- --runInBand`, `npx expo-doctor`, and `npx expo export --platform android`.

Expected: All tests pass, Expo reports no incompatible dependency/configuration issue, and Android export completes.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/features/cooking src/services src/features/settings app README.md
git commit -m "feat: add cooking confirmation and data backup"
```

## Unresolved product decisions

None block the implementation. The following technical choices are implementation recommendations and must be verified against the selected Expo SDK before use: exact dependency versions, backup archive library/API compatibility, Android application identifier, and final icon/font assets. Use a stable reverse-domain application identifier derived from the repository owner only after checking it is not already used in the project configuration.
