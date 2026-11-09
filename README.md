# Recipe & Kitchen

An Android-only household recipe book and kitchen inventory. The app is offline-first and stores data in SQLite on the device. No login, backend, cloud sync, or paid API is required.

## Included in this milestone

- Expo Router app shell with Home, Recipes, Inventory, and Shopping tabs.
- Local SQLite schema with versioned initialization and foreign-key enforcement.
- Recipe persistence/search data layer and recipe ingredient catalogue.
- Kitchen stock balances, minimum stock thresholds, and stock adjustments.
- Automatic shopping needs derived from inventory at read time, plus independent manual shopping items.
- Pure functions for low-stock calculations, serving scaling, and safe unit conversions.

## Setup (Windows CMD)

Requires Node.js 22.13+ and Android Studio / Android SDK.

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

Use `a` in the Expo terminal to launch an Android emulator. For a native APK, use an EAS Android build or generate the native project and build with Gradle.

## Verification

```cmd
npm test
npm run typecheck
npx expo-doctor
npx expo export --platform android
```

All core data is local. Backup/restore is a planned milestone, so do not uninstall or clear app storage before backup support is implemented.

## Remaining milestones

Recipe editing/detail screens, inventory purchase flow, confirmed cooking deductions and history, image storage, and validated backup/restore are not yet complete.