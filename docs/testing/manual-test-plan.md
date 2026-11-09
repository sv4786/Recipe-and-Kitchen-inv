# Recipe & Kitchen manual test plan

Run this after installing the app on an Android device or emulator. Start with a fresh install so the database is empty.

## 1. Recipe creation and search

Create this sample recipe:

**Sunday Pancakes**
- Description: A simple family breakfast.
- Servings: 4.
- Flour, 200, g
- Milk, 300, ml
- Eggs, 2, item

Instructions:
1. Mix the flour and milk.
2. Add the eggs and whisk until smooth.
3. Cook portions in a lightly oiled pan until golden.

Expected:
- The recipe appears in the recipe list.
- Searching for `Sunday Pancakes` finds it.
- Searching for `Milk` also finds it.
- Opening the recipe shows the ingredients and instructions in the saved order.

## 2. Inventory and automatic shopping

Add these inventory items:

| Ingredient | Current quantity | Minimum quantity | Unit |
|---|---:|---:|---|
| Flour | 500 | 300 | g |
| Milk | 100 | 500 | ml |
| Eggs | 4 | 2 | item |

Expected:
- All three items appear in inventory.
- Only Milk appears in the automatic shopping list.
- The suggested Milk purchase is 400 ml.

## 3. Partial purchase

From the automatic Milk item, record an actual purchase of **100 ml**.

Expected:
- Milk stock becomes 200 ml, not 500 ml.
- The automatic shopping need recalculates to 300 ml.
- The app does not assume the full suggested quantity was bought.

## 4. Cooking confirmation and stock deductions

Open Sunday Pancakes and choose 4 servings.

1. Preview ingredient usage.
2. Note the expected deductions.
3. Cancel cooking and return to inventory.
4. Confirm that no quantities changed.
5. Open the recipe again, preview, and confirm cooking.

Expected after confirmation:

| Ingredient | Before cooking | Deducted | After cooking |
|---|---:|---:|---:|
| Flour | 500 g | 200 g | 300 g |
| Milk | 200 ml | 200 ml | 0 ml |
| Eggs | 4 item | 2 item | 2 item |

The Milk preview should show a 100 ml shortage. Stock must stop at zero, never become negative. The app should add one cooking-history entry.

## 5. Manual shopping items

Add `Dish soap` to the manual shopping list and mark it complete.

Expected:
- Dish soap appears independently of inventory.
- Tapping it marks it complete.
- Automatic stock needs remain derived from inventory and are not duplicated as manual rows.

## 6. Backup and restore

1. Open Home → Backup & settings.
2. Create and share a backup, then save the JSON file somewhere accessible.
3. Change one inventory quantity.
4. Restore the saved backup and confirm the replacement.
5. Reopen inventory and verify the original quantities return.

Expected:
- The backup file contains the recipe, ingredients, inventory, shopping items and cooking history.
- The selected file is validated before the replacement confirmation.
- A local safety copy is saved before restore.
- An invalid or unsupported JSON file is rejected without replacing current data.

## 7. Offline check

Enable airplane mode and reopen the app.

Expected:
- Recipes, inventory, shopping list and cooking history remain available.
- Recipe search, stock adjustments and cooking confirmation continue to work without an internet connection.

## Report a failure

If a step does not match its expected result, note the step number, what you tapped, what happened, and any error message. Do not clear app storage or uninstall the app if it contains data you want to keep; backup/restore should be tested first.
