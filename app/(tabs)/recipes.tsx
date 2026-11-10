import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { addRecipe, listInventory, searchRecipes } from '@/database/storage';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { IngredientEntry, type IngredientEntryValue } from '@/components/IngredientEntry';

export default function RecipesScreen() {
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<Awaited<ReturnType<typeof searchRecipes>>>([]);
  const [pantryNames, setPantryNames] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('4');
  const [ingredientEntries, setIngredientEntries] = useState<IngredientEntryValue[]>([{ name: '', quantity: '', unit: 'item' }]);
  const [stepLines, setStepLines] = useState('');

  const refresh = useCallback(() => {
    searchRecipes(db, query)
      .then(setRecipes)
      .catch(() => undefined);
  }, [db, query]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      listInventory(db).then((items) => setPantryNames(items.map((item) => item.name))).catch(() => undefined);
    }, [db]),
  );

  async function saveRecipe() {
    try {
      const enteredIngredients = ingredientEntries.filter((entry) =>
        entry.name.trim() || entry.quantity.trim(),
      );

      if (enteredIngredients.some((entry) =>
        !entry.name.trim() || !entry.quantity.trim() ||
        !Number.isFinite(Number(entry.quantity)) || Number(entry.quantity) < 0,
      )) {
        Alert.alert('Check ingredients', 'Each ingredient needs a name and a valid quantity.');
        return;
      }

      const ingredients = enteredIngredients.map((entry) => ({
        name: entry.name.trim(),
        quantity: Number(entry.quantity),
        unit: entry.unit,
      }));

      const steps = stepLines
        .split('\n')
        .map((step) => step.trim())
        .filter(Boolean);

      await addRecipe(db, {
        title,
        description,
        servings: Number(servings),
        ingredients,
        steps,
      });

      setTitle('');
      setDescription('');
      setServings('4');
      setIngredientEntries([{ name: '', quantity: '', unit: 'item' }]);
      setStepLines('');
      setShowForm(false);
      refresh();

      Alert.alert(
        'Recipe saved',
        'Your recipe is now in the family recipe book.',
      );
    } catch (error) {
      Alert.alert(
        'Could not save recipe',
        error instanceof Error
          ? error.message
          : 'Please check the recipe details.',
      );
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Recipe book</Text>
      <Text style={styles.subtitle}>
        Find a family favourite by name or ingredient.
      </Text>

      <TextInput
        accessibilityLabel="Search recipes or ingredients"
        placeholder="Search recipes or ingredients"
        value={query}
        onChangeText={setQuery}
        style={styles.input}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => setShowForm((visible) => !visible)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {showForm ? 'Close recipe form' : '+ Add a recipe'}
        </Text>
      </Pressable>

      {showForm ? (
        <View style={styles.form}>
          <Text style={styles.heading}>A new family favourite</Text>

          <TextInput
            accessibilityLabel="Recipe title"
            placeholder="Recipe name"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          <TextInput
            accessibilityLabel="Recipe description"
            placeholder="A little note about this dish (optional)"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Servings</Text>
          <View style={styles.chipRow}>
            {[1, 2, 3, 4, 6, 8, 10, 12].map((count) => (
              <Pressable key={count} accessibilityRole="radio" accessibilityState={{ selected: servings === String(count) }} onPress={() => setServings(String(count))} style={[styles.choiceChip, servings === String(count) ? styles.choiceChipSelected : null]}>
                <Text style={[styles.choiceChipText, servings === String(count) ? styles.choiceChipTextSelected : null]}>{count}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Ingredients</Text>
          <Text style={styles.hint}>Add each ingredient separately and choose its measurement.</Text>
          {ingredientEntries.map((entry, index) => (
            <IngredientEntry
              key={index}
              index={index}
              value={entry}
              suggestions={pantryNames}
              onChange={(value) => setIngredientEntries((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))}
              onRemove={ingredientEntries.length > 1 ? () => setIngredientEntries((current) => current.filter((_, itemIndex) => itemIndex !== index)) : undefined}
            />
          ))}
          <Pressable accessibilityRole="button" onPress={() => setIngredientEntries((current) => [...current, { name: '', quantity: '', unit: 'item' }])} style={styles.addIngredient}>
            <Text style={styles.addIngredientText}>+ Add another ingredient</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>
            Instructions, one step per line
          </Text>
          <TextInput
            accessibilityLabel="Recipe instructions"
            placeholder={'Mix the ingredients\nBake until golden'}
            multiline
            value={stepLines}
            onChangeText={setStepLines}
            style={[styles.input, styles.multiline]}
          />

          <Pressable
            accessibilityRole="button"
            onPress={saveRecipe}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Save recipe</Text>
          </Pressable>
        </View>
      ) : null}

      {recipes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emoji}>📖</Text>
          <Text style={styles.heading}>
            {query ? 'No recipes found' : 'Your recipe book is empty'}
          </Text>
          <Text style={styles.copy}>
            {query
              ? 'Try another recipe name or ingredient.'
              : 'Start saving the meals everyone asks for again.'}
          </Text>
        </View>
      ) : (
        recipes.map((recipe) => (
          <Pressable
            accessibilityRole="button"
            key={recipe.id}
            onPress={() =>
              router.push({
                pathname: '/recipe/[id]',
                params: { id: recipe.id },
              })
            }
            style={styles.card}
          >
            <Text style={styles.name}>{recipe.title}</Text>
            {recipe.description ? (
              <Text style={styles.copy}>{recipe.description}</Text>
            ) : null}
            <Text style={styles.meta}>
              Makes {recipe.default_servings} servings · View recipe ›
            </Text>
          </Pressable>
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
  subtitle: {
    color: colors.muted,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 14,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heading: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  fieldLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 9 },
  choiceChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceChipText: { color: colors.text, fontWeight: '700' },
  choiceChipTextSelected: { color: '#FFFFFF' },
  addIngredient: { padding: 12, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radii.md },
  addIngredientText: { color: colors.primary, fontWeight: '800' },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 32,
  },
  copy: {
    color: colors.muted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 5,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
