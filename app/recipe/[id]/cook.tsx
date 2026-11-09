import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  confirmCooking,
  previewCooking,
  type CookingPreview,
} from '@/database/cooking';
import { recipeForDetail } from '@/database/storage';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function CookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [servings, setServings] = useState('');
  const [preview, setPreview] = useState<CookingPreview | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const eventId = useRef(
    `cook-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  useEffect(() => {
    if (id) {
      recipeForDetail(db, id)
        .then((recipe) => {
          setServings(String(recipe?.default_servings ?? 4));
        })
        .catch(() => undefined);
    }
  }, [db, id]);

  async function reviewIngredientUsage() {
    try {
      const nextPreview = await previewCooking(db, id, Number(servings));
      setPreview(nextPreview);
    } catch (error) {
      Alert.alert(
        'Could not prepare cooking preview',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }

  async function confirmCooked() {
    if (!preview) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await confirmCooking(
        db,
        eventId.current,
        id,
        Number(servings),
      );

      Alert.alert(
        result.alreadyApplied ? 'Already recorded' : 'Cooking recorded',
        result.alreadyApplied
          ? 'This cooking event was already applied.'
          : 'Inventory has been updated. Items with insufficient stock were only deducted down to zero.',
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Could not record cooking',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>‹ Back to recipe</Text>
      </Pressable>

      <Text style={styles.title}>Ready to cook?</Text>
      <Text style={styles.copy}>
        Choose the number of servings. Review the stock changes before
        confirming.
      </Text>

      <Text style={styles.label}>Servings</Text>
      <TextInput
        accessibilityLabel="Number of servings"
        keyboardType="number-pad"
        value={servings}
        onChangeText={(value) => {
          setServings(value);
          setPreview(null);
        }}
        style={styles.input}
      />

      <Pressable
        accessibilityRole="button"
        onPress={reviewIngredientUsage}
        style={styles.secondary}
      >
        <Text style={styles.secondaryText}>Preview ingredient usage</Text>
      </Pressable>

      {preview ? (
        <>
          <Text style={styles.section}>
            Stock changes for {preview.recipeTitle}
          </Text>

          {preview.lines.map((line) => (
            <View key={line.ingredientId} style={styles.card}>
              <Text style={styles.name}>{line.name}</Text>

              {line.status === 'untracked' ? (
                <Text style={styles.note}>
                  Not tracked in inventory. No stock change.
                </Text>
              ) : line.status === 'incompatible' ? (
                <Text style={styles.warning}>
                  Unit mismatch: recipe uses {line.recipeUnit}, inventory uses{' '}
                  {line.inventoryUnit}. No stock change.
                </Text>
              ) : (
                <>
                  <Text style={styles.note}>
                    Recipe needs {line.requestedQuantity} {line.recipeUnit}
                  </Text>
                  <Text style={styles.note}>
                    Will deduct {line.deductQuantity} {line.inventoryUnit}
                  </Text>
                  {line.shortage > 0 ? (
                    <Text style={styles.warning}>
                      Short by {line.shortage} {line.inventoryUnit}. Stock will
                      not go below zero.
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          ))}

          <Text style={styles.disclaimer}>
            Nothing changes if you cancel. Confirming records this cooking
            event once and applies the deductions together.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={confirmCooked}
            style={[styles.button, isSaving ? styles.disabled : null]}
          >
            <Text style={styles.buttonText}>
              {isSaving ? 'Saving…' : 'Confirm cooking and update stock'}
            </Text>
          </Pressable>
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.cancel}
      >
        <Text style={styles.link}>Cancel cooking</Text>
      </Pressable>
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
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '800',
  },
  copy: {
    color: colors.muted,
    lineHeight: 22,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 14,
    color: colors.text,
  },
  secondary: {
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    padding: 15,
    alignItems: 'center',
  },
  secondaryText: {
    color: colors.primary,
    fontWeight: '800',
  },
  section: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
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
  note: {
    color: colors.muted,
    fontSize: 13,
  },
  warning: {
    color: colors.warning,
    fontWeight: '700',
    fontSize: 13,
  },
  disclaimer: {
    color: colors.muted,
    lineHeight: 20,
    fontSize: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: 16,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cancel: {
    alignItems: 'center',
    padding: 10,
  },
});
