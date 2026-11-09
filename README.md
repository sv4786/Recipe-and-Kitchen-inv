# Recipe & Kitchen

An Android-only household recipe book and kitchen inventory. The app is offline-first and stores data in SQLite on the device. No login, backend, cloud sync, or paid API is required.

## Implemented

- Create and search family recipes by title or ingredient.
- Save ingredient quantities and ordered cooking instructions.
- Open recipe details and scale a cooking session to a chosen serving count.
- Preview recipe ingredient deductions before cooking.
- Require explicit confirmation before stock changes; cancelling does not deduct stock.
- Deduct no more than available stock, never allow negative inventory, and protect cooking events against duplicate application.
- Track ingredient stock, minimum quantities and stock adjustments.
- Calculate automatic shopping needs from live inventory state without persisting duplicate generated rows.
- Add manual shopping items independently of inventory.
- Record the actual quantity purchased and recalculate the remaining shortfall.
- Review chronological cooking history.
- Create and share a local JSON backup; validate a selected backup before restoring it.
- Keep a pre-restore safety copy on the device.
- Persist data in versioned SQLite migrations with foreign-key enforcement.

## Requirements

- Node.js 22.13 or newer.
- Android Studio / Android SDK for local Android builds.

## Setup (Windows CMD)

```cmd
git clone https://github.com/sv4786/Recipe-and-Kitchen-inv.git
cd Recipe-and-Kitchen-inv
git checkout feat/recipe-kitchen-app
npm install
npx expo install --fix
npm run typecheck
npm test
npx expo start
```

Use `a` in the Expo terminal to launch an Android emulator. To build a local release APK without an EAS account, run these commands from the project root:

```cmd\nnpx expo prebuild --platform android\ncd android\ngradlew.bat assembleRelease\ncd ..\n```\n\nThe APK is written to `android\\app\\build\\outputs\\apk\\release\\app-release.apk`.\n\n## Verification

```cmd
npm test
npm run typecheck
npx expo-doctor
npx expo export --platform android
```

The repository's test files cover low-stock boundaries, serving scaling, compatible unit conversions, cooking deduction previews, and backup validation. Run the commands above locally before relying on a release build.

## Backup and privacy

All core data stays in the app's local SQLite database. Use **Home → Backup & settings** to export a JSON backup before changing phones or reinstalling. Restore validates the selected file and saves a local safety copy before replacing the current data. Keep exported backups somewhere private.

## Current limitations

- Recipe photos, recipe editing/deletion, ingredient categories and expiry reminders are not included yet.
- Backup files currently contain structured recipe and kitchen data; no photo files are included.
- Backup restore and Android installation still need hands-on device verification.
