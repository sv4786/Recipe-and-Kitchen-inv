import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { listInventory, searchRecipes } from '@/database/storage';
import { getLowStockItems } from '@/domain/kitchen';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type DashboardCounts = {
  recipes: number;
  inventory: number;
  low: number;
};

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [counts, setCounts] = useState<DashboardCounts>({
    recipes: 0,
    inventory: 0,
    low: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([searchRecipes(db), listInventory(db)])
        .then(([recipes, inventory]) => {
          if (!isActive) {
            return;
          }

          const lowStockItems = getLowStockItems(
            inventory.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              minimumQuantity: item.minimum_quantity,
              unit: item.unit_code,
              category: item.category,
            })),
          );

          setCounts({
            recipes: recipes.length,
            inventory: inventory.length,
            low: lowStockItems.length,
          });
        })
        .catch(() => undefined);

      return () => {
        isActive = false;
      };
    }, [db]),
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR HOME KITCHEN</Text>
      <Text style={styles.title}>Good things start here.</Text>
      <Text style={styles.subtitle}>
        Family favourites, pantry essentials and the next grocery run, all in
        one place.
      </Text>

      <View style={styles.row}>
        <Stat value={counts.recipes} label="Recipes saved" />
        <Stat value={counts.inventory} label="Ingredients" />
        <Stat value={counts.low} label="Restock" />
      </View>

      <Text
        accessibilityRole="link"
        onPress={() => router.push('/history')}
        style={styles.history}
      >
        View cooking history ›
      </Text>
      <Text
        accessibilityRole="link"
        onPress={() => router.push('/settings')}
        style={styles.history}
      >
        Backup & settings ›
      </Text>

      <View style={styles.welcome}>
        <Text style={styles.emoji}>🥣</Text>
        <Text style={styles.heading}>A calmer kitchen starts here</Text>
        <Text style={styles.copy}>
          Add a family recipe, keep an eye on pantry stock, and let the shopping
          list work out what is running low.
        </Text>
      </View>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.number}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontSize: 11,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 23,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 94,
    justifyContent: 'center',
  },
  number: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: '800',
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  history: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  welcome: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  emoji: {
    fontSize: 34,
  },
  heading: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
  copy: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: 'center',
  },
});
