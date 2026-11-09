import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { listCookingHistory } from '@/database/cooking';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function CookingHistoryScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof listCookingHistory>>
  >([]);

  useFocusEffect(
    useCallback(() => {
      listCookingHistory(db)
        .then(setItems)
        .catch(() => undefined);
    }, [db]),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.back} onPress={() => router.back()}>
        ‹ Back
      </Text>
      <Text style={styles.title}>Cooking history</Text>
      <Text style={styles.subtitle}>
        A little record of what has been made.
      </Text>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.heading}>Nothing cooked yet</Text>
          <Text style={styles.copy}>
            Confirmed cooking sessions will appear here.
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.recipe_title}</Text>
            <Text style={styles.copy}>
              {item.servings} servings ·{' '}
              {new Date(
                `${item.cooked_at.replace(' ', 'T')}Z`,
              ).toLocaleString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  back: {
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: 8,
  },
  heading: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  copy: {
    color: colors.muted,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 5,
  },
  name: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
});
