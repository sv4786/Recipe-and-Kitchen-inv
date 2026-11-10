import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { initializeDatabase } from '@/database/storage';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName="recipe-kitchen.db"
        onInit={initializeDatabase}
      >
        <StatusBar style="dark" />
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" />
          </Stack>
        </SafeAreaView>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
