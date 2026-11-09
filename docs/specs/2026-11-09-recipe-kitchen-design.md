# Recipe & Kitchen Android App: Product and Technical Design

- **Date:** 2026-11-09
- **Repository:** sv4786/Recipe-and-Kitchen-inv
- **Status:** Design approved; written specification awaiting user review
- **Target:** Android, single-device household use
- **Product direction:** Offline-first recipe book, kitchen inventory, and automatically maintained shopping list

## 1. Purpose and goals

Recipe & Kitchen helps a household keep recipes and kitchen stock in one simple Android app. Its primary user should be able to save and find recipes, see what ingredients are available, and know what needs to be bought without manually rebuilding a shopping list before every shop.

### Goals

1. Create, edit, browse, search, favourite, and cook saved recipes.
2. Track ingredients and quantities held in the kitchen.
3. Generate a shopping list automatically when stock reaches or falls below its configured minimum.
4. Let the user add one-off shopping items manually.
5. Offer a review-and-confirm step before recipe cooking deducts stock.
6. Keep all core functionality available offline, with data stored on the device.
7. Provide a backup and restore path to reduce the risk of losing household data.

### Non-goals for version 1

- Multi-user accounts or household sharing across devices.
- Cloud synchronisation or a hosted backend.
- AI recipe generation, nutrition analysis, or meal planning.
- Online grocery ordering, barcode scanning, or retailer integrations.
- Cross-platform iOS support in the initial release.

## 2. Users and usage assumptions

- The app is for one household and one primary Android device.
- It must be comfortable for a non-technical user to operate during normal kitchen tasks.
- Large touch targets, readable text, clear labels, and low-friction forms take priority over dense dashboards.
- No login or internet connection is required for normal use.
- The app should use a warm, calm visual style: cream backgrounds, forest-green primary actions, sage secondary surfaces, charcoal text, rounded cards, and optional food photography.

## 3. Recommended implementation approach

Use **Expo React Native with TypeScript**, Expo Router for navigation, and SQLite through Expo SQLite for persistent local data.

This approach is recommended over a native Kotlin/Room implementation because it allows a focused Android app to be built quickly while keeping the codebase approachable and testable. A cloud-backed architecture is intentionally excluded because this is a single-device, offline-first application.

### Proposed stack

| Concern | Choice |
|---|---|
| Mobile framework | Expo React Native |
| Language | TypeScript |
| Navigation | Expo Router |
| Local persistence | Expo SQLite |
| Forms and validation | Zod with typed form state |
| Image selection | Expo Image Picker |
| Local notifications | Expo Notifications, where supported and useful |
| Tests | Jest and React Native Testing Library |
| Android packaging | EAS Build or the repository's verified local Expo/Gradle workflow |

Exact package versions and compatible Expo SDK versions must be selected when implementation begins, based on the current stable Expo SDK and its compatibility matrix. Do not assume versions before inspecting the toolchain.

## 4. Information architecture and screens

A persistent bottom navigation bar provides four primary destinations: **Home**, **Recipes**, **Inventory**, and **Shopping**. Add/edit screens and detail views are pushed above these destinations.

### 4.1 Home dashboard

Show concise household status and useful shortcuts:

- Number of saved recipes.
- Number of tracked inventory ingredients.
- Number of ingredients currently below their minimum stock.
- Number of items needing attention on the shopping list.
- Recently added recipes and favourites.
- Quick actions to add a recipe, add an ingredient, or adjust stock.

The dashboard must not require the user to understand charts or analytics.

### 4.2 Recipe library and recipe details

The recipe library supports:

- Search by recipe title and ingredient name.
- Filter by category and favourites.
- Sort alphabetically and by recently added.
- Recipe cards with optional image, title, category, and preparation/cooking time.

A recipe stores:

- Title (required).
- Optional description and image.
- Category and optional tags.
- Preparation time and cooking time.
- Default serving count (positive integer).
- Ordered ingredients with quantity and unit.
- Ordered instruction steps.
- Favourite flag and created/updated timestamps.

Recipe details show the ingredients, servings, timings, and numbered instructions. Users can change the displayed serving count; ingredient quantities scale proportionally from the recipe's stored default servings. Scaling is a preview and must not mutate the saved recipe.

### 4.3 Recipe editor

The editor supports creating and editing recipes, adding/removing/reordering ingredients and steps, selecting a category, setting timings and servings, and optionally selecting a local photo.

Recipe ingredients should reference the canonical ingredient catalogue where a match exists. If a recipe uses an ingredient not yet in the catalogue, the user can create it from the editor. Similar-looking names must not be silently merged; the user should choose an existing match or explicitly create a new ingredient.

### 4.4 Kitchen inventory

Each tracked ingredient has:

- Name and optional notes.
- Category (for example produce, dairy, meat, pantry, spices, frozen).
- Current quantity.
- Unit of measure.
- Minimum stock quantity.
- Optional storage location (pantry, fridge, freezer, or other).
- Optional expiry date.
- Created/updated timestamps.

Inventory actions:

- Add, edit, and remove an ingredient.
- Increase or decrease stock with a clear quantity control.
- Correct an incorrect quantity.
- Search and filter by category, location, and low-stock status.
- Show low-stock and expired/near-expiry indicators.

For version 1, maintain one stock balance and one optional storage location per canonical ingredient. Multiple separate batches or multiple storage locations for the same ingredient are outside the initial scope.

### 4.5 Shopping list

The shopping screen combines two sources:

1. **Automatically needed items**, derived from current inventory and minimum stock settings.
2. **Manual items**, entered directly by the user for things that are not tracked in inventory.

Automatically generated items are not duplicated as the app refreshes. They are calculated from inventory state, rather than stored as independent shopping-list rows.

For an ingredient with current quantity C and minimum stock quantity M:

- It is needed when C is less than M.
- Suggested quantity to buy is M minus C.
- When C is greater than or equal to M, it is not automatically needed.

The list is grouped by ingredient category, with an uncategorised group where necessary. Users can mark manual items complete, remove them, and add notes or quantities.

For an automatically needed item, the user selects **Purchased** and enters the actual quantity bought. The app adds that quantity to inventory and recalculates the requirement. If the new stock is still below minimum, the remaining amount stays visible. The app must not assume the user bought the suggested amount.

Manual shopping items are independent of inventory unless the user explicitly chooses to link the purchase to a tracked ingredient. Completing a manual item alone must not invent an inventory quantity.

### 4.6 Cooking flow and inventory deduction

From a recipe detail screen, the user selects **Cook this recipe** and confirms the number of servings being prepared.

The app then:

1. Scales the recipe ingredient quantities to the selected servings.
2. Matches recipe ingredients to tracked inventory ingredients.
3. Calculates proposed deductions.
4. Displays the proposed stock changes and any shortages.
5. Requires explicit user confirmation before changing inventory.
6. Applies all accepted deductions in one database transaction.
7. Records a cooking-history entry and recalculates automatic shopping needs.

Rules:

- Cancelling or leaving the confirmation screen makes no inventory changes.
- The confirmation screen clearly identifies ingredients not tracked in inventory; these are skipped.
- If available stock is less than the recipe amount, the preview shows the shortage. On confirmation, deduct no more than the available quantity; stock must never become negative. The cooking-history entry records the requested amount and actual deducted amount.
- A confirmed cooking action must be applied at most once. Use a unique cooking-event identifier and transactional writes to prevent accidental duplicate deductions.
- Units must be compatible before deduction. Do not perform unsafe conversions between mass and volume (for example grams to millilitres) without ingredient-specific conversion data. Unsupported conversions must be flagged for review rather than guessed.
- Cooking history is available as a basic chronological record; advanced analytics are not required.

## 5. Automatic shopping-list rules

The low-stock calculation is deterministic and runs after any inventory change, minimum-stock change, confirmed cooking event, or recorded purchase.

For each tracked ingredient:

    neededQuantity = max(0, minimumStockQuantity - currentQuantity)

An ingredient is included only when neededQuantity is greater than zero.

The app should calculate list state from the current inventory data, not append a new row every time a screen loads. This avoids duplicate entries and stale quantities.

### Purchase update transaction

When a user records a purchase for an automatically needed ingredient:

1. Validate that the purchased quantity is positive and uses a compatible unit.
2. Add the purchased quantity to current inventory.
3. Persist the stock update.
4. Recalculate the low-stock quantity.
5. Commit the transaction.

If validation or persistence fails, no partial inventory update should be left behind.

## 6. Data model

Use SQLite with foreign keys enabled and versioned schema migrations.

### Core tables

| Table | Important fields and purpose |
|---|---|
| recipes | id, title, description, image_uri, category_id, prep_minutes, cook_minutes, default_servings, is_favourite, timestamps |
| ingredients | id, name, normalized_name, category_id, timestamps |
| recipe_ingredients | id, recipe_id, ingredient_id, quantity, unit_code, optional display note, sort order |
| recipe_steps | id, recipe_id, instruction, sort order |
| inventory | id, ingredient_id (unique), quantity, unit_code, minimum_quantity, location, expiry_date, timestamps |
| categories | id, name, kind (recipe, ingredient, or shared), sort order |
| shopping_items | id, name, optional ingredient_id, optional quantity and unit_code, notes, is_completed, timestamps; stores manual items only |
| cooking_history | id, unique event_id, recipe_id, servings, cooked_at |
| cooking_deductions | id, cooking_history_id, ingredient_id, requested_quantity, deducted_quantity, unit_code |

All primary keys should be stable local identifiers. Define foreign-key deletion behaviour explicitly: deleting a recipe may delete its recipe ingredient and step rows; deleting an ingredient must not silently erase a recipe's ingredient meaning. Prefer preventing deletion while referenced, or provide an explicit replace/remove flow. Inventory deletion should require an intentional user action.

### Units and quantities

- Store numeric quantities as SQLite REAL values with validation against negative or non-finite values.
- Use canonical unit codes internally and readable labels in the UI.
- Support common units: g, kg, ml, l, tsp, tbsp, cup, and item/count.
- Implement only well-defined conversions within compatible dimensions (mass-to-mass, volume-to-volume, and count-to-count where meaningful).
- Do not infer ingredient density or convert mass to volume.
- Keep the entered display unit where useful, but normalise compatible quantities to a consistent unit for arithmetic.
- Reject or request correction for incompatible recipe and inventory units.

### Images and backup data

Store selected image files in app-managed local storage and persist their local URI/path in SQLite. Do not store large image binaries in database rows. Handle missing image files gracefully.

Provide a user-initiated backup and restore workflow. A backup must include the database and referenced local images, or use a documented portable archive format that preserves their relationships. Validate a backup before replacing current data. Never silently overwrite the current database during restore; require confirmation and retain a recoverable pre-restore backup where practical.

## 7. Architecture and module boundaries

Keep UI, domain rules, and persistence separate.

Suggested high-level modules:

- app/: Expo Router routes and screen composition.
- components/: Reusable buttons, cards, inputs, empty states, quantity controls, and confirmation dialogs.
- features/recipes/: Recipe screens, editor, search, and recipe-specific domain operations.
- features/inventory/: Inventory screens and stock adjustment operations.
- features/shopping/: Shopping-list composition, manual items, and purchase recording.
- features/cooking/: Serving scaling, deduction preview, confirmation, and cooking history.
- database/: SQLite connection, schema migrations, repositories, and transaction helpers.
- domain/: Unit conversion, low-stock calculation, validation schemas, and pure business rules.
- services/: Image file management, backup/restore, and local notifications.
- types/: Shared TypeScript domain and persistence types.

Repositories own SQL access. Domain functions should be pure where possible, so low-stock calculations, serving scaling, and deduction previews can be tested without a device database. Screens should not contain raw SQL or duplicate business rules.

## 8. Error handling and reliability

- Validate all user-entered quantities, serving counts, dates, and required names.
- Show actionable error messages; do not silently discard edits.
- Use database transactions for multi-row operations such as recipe saves, cooking deductions, and purchase updates.
- Enable and verify SQLite foreign-key enforcement.
- Apply schema migrations in a controlled, versioned sequence.
- Handle empty states for new installations and no-search-results states.
- If an image is missing or unreadable, show a placeholder without crashing.
- If a backup is invalid, reject it and leave current data unchanged.
- Core recipe, inventory, and shopping functionality must not depend on network access.
- Do not create low-stock notifications until notification permissions and useful notification behaviour are defined; the low-stock state must always be visible in-app regardless.

## 9. Accessibility and usability

- Use readable default font sizes and support Android font scaling.
- Use large touch targets and sufficient contrast.
- Do not communicate low stock, expiry, or errors by colour alone; include text or icons with labels.
- Label form fields and validation errors clearly.
- Keep common actions reachable with one hand where practical.
- Make quantity entry straightforward and support decimal quantities where appropriate.
- Confirm destructive actions such as deleting recipes or ingredients and restoring backups.

## 10. Testing strategy and acceptance criteria

Test domain rules independently, database behaviour with an isolated SQLite database, and user flows with component/screen tests.

### Domain tests

- Low-stock calculation at, below, and above the threshold.
- Serving scaling for integer and fractional quantities.
- Unit conversion within supported dimensions.
- Rejection of incompatible units and invalid quantities.
- Deduction preview with sufficient, insufficient, and missing inventory.
- No negative inventory after a confirmed cooking event.

### Database and transaction tests

- Create, edit, search, favourite, and delete recipes.
- Persist ordered recipe ingredients and steps.
- Add and adjust inventory quantities.
- Verify foreign keys and migrations.
- Confirm cooking deductions are atomic and cannot be applied twice.
- Confirm a failed purchase update does not partially change inventory.
- Verify automatic shopping needs are derived without duplicate records.
- Verify backup validation and restore safety.

### User-flow acceptance criteria

1. A user can create a recipe with ingredients and instructions, close the app, reopen it, and find the saved recipe.
2. A user can search for a recipe by title or ingredient.
3. A user can create an inventory ingredient and set its current and minimum quantities.
4. When current stock falls below minimum, the correct shortfall appears on the shopping list without manual entry.
5. When stock is at or above minimum, the ingredient does not appear as automatically needed.
6. Recording a purchase adds the actual entered quantity and recalculates the remaining shortfall.
7. A user can add and complete a manual shopping item without unintentionally changing inventory.
8. Cooking a recipe displays a scaled deduction preview and does not change inventory until confirmation.
9. Cancelling a cooking confirmation leaves inventory unchanged.
10. Confirming a cooking event applies compatible deductions once, records history, and recalculates shopping needs.
11. Insufficient stock is clearly shown and never results in negative inventory.
12. Core workflows work in airplane mode.
13. A valid backup can be restored, while an invalid backup leaves existing data intact.
14. The Android app can be built and installed using a documented, reproducible workflow.

## 11. Delivery phases

Implementation should be delivered in independently testable stages:

1. **Foundation:** Expo project, TypeScript configuration, navigation, visual theme, SQLite connection, migrations, and shared components.
2. **Recipes:** Recipe CRUD, ingredient catalogue integration, ordered instructions, image selection, favourites, search, and serving scaling.
3. **Inventory:** Ingredient catalogue, stock balances, minimum levels, locations, expiry dates, and stock adjustments.
4. **Shopping:** Derived automatic low-stock list, manual items, purchase recording, and recalculation.
5. **Cooking:** Serving selection, deduction preview, confirmation, atomic stock updates, and cooking history.
6. **Reliability and polish:** Backup/restore, accessibility, empty/error states, and optional local notifications.
7. **Release verification:** Run unit, database, and UI tests; produce and verify an Android APK; document installation and test routines.

Each phase must have passing focused tests before moving to the next. Run the full suite and Android build verification before calling the release complete.

## 12. Decisions and constraints

The following decisions are approved and fixed for version 1:

- Android only.
- Single-device household use.
- Local SQLite persistence and offline-first operation.
- Automatic shopping list based on minimum stock thresholds.
- Manual shopping items are also supported.
- Recipe cooking proposes stock deductions and requires explicit confirmation.
- Confirmed deductions are transactional, idempotent, and cannot make stock negative.
- No backend, authentication, cloud sync, or paid API dependency.
- Warm, readable kitchen-oriented visual design.

## 13. Open implementation details

These are implementation choices, not unresolved product requirements:

- Select package versions compatible with the current stable Expo SDK when implementation starts.
- Choose the final backup archive format and platform-safe file export/import mechanism.
- Choose the exact icon set and typography after the base theme is established.
- Confirm the final Android application identifier and display name before producing release builds.
