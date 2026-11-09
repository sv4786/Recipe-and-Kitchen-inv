import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { initializeDatabase } from '@/database/storage';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="recipe-kitchen.db"
      onInit={initializeDatabase}
    >
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SQLiteProvider>
  );
}
