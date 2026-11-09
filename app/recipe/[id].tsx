import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { recipeForDetail } from '@/database/storage';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [recipe, setRecipe] = useState<
    Awaited<ReturnType<typeof recipeForDetail>>
  >(null);

  useEffect(() => {
    if (id) {
      recipeForDetail(db, id)
        .then(setRecipe)
        .catch(() => undefined);
    }
  }, [db, id]);

  if (!recipe) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Recipe not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>‹ Back to recipes</Text>
      </Pressable>

      <Text style={styles.title}>{recipe.title}</Text>
      {recipe.description ? (
        <Text style={styles.copy}>{recipe.description}</Text>
      ) : null}
      <Text style={styles.meta}>
        Makes {recipe.default_servings} servings
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: '/recipe/[id]/cook',
            params: { id: recipe.id },
          })
        }
        style={styles.button}
      >
        <Text style={styles.buttonText}>Cook this recipe</Text>
      </Pressable>

      <Text style={styles.section}>Ingredients</Text>
      {recipe.ingredients.length === 0 ? (
        <Text style={styles.copy}>No ingredients added yet.</Text>
      ) : (
        recipe.ingredients.map((ingredient, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.copy}>{ingredient.name}</Text>
            <Text style={styles.amount}>
              {ingredient.quantity} {ingredient.unit_code}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.section}>Instructions</Text>
      {recipe.steps.length === 0 ? (
        <Text style={styles.copy}>No instructions added yet.</Text>
      ) : (
        recipe.steps.map((step, index) => (
          <View key={index} style={styles.step}>
            <Text style={styles.stepNumber}>{index + 1}</Text>
            <Text style={styles.copy}>{step.instruction}</Text>
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
    paddingBottom: 40,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '800',
  },
  copy: {
    color: colors.muted,
    lineHeight: 23,
    fontSize: typography.body,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
  meta: {
    color: colors.primary,
    fontWeight: '700',
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  section: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amount: {
    color: colors.primary,
    fontWeight: '700',
  },
  step: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 17,
  },
});
