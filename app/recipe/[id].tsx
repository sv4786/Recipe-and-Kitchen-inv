import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { listInventory, recipeForDetail, updateRecipe } from '@/database/storage';
import { IngredientEntry, type IngredientEntryValue } from '@/components/IngredientEntry';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [recipe, setRecipe] = useState<Awaited<ReturnType<typeof recipeForDetail>>>(null);
  const [editing, setEditing] = useState(false);
  const [pantryItems, setPantryItems] = useState<Array<{ name: string; unit: string }>>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('4');
  const [ingredients, setIngredients] = useState<IngredientEntryValue[]>([]);
  const [instructions, setInstructions] = useState('');

  const loadRecipe = useCallback(async () => {
    if (!id) return;
    const loaded = await recipeForDetail(db, id);
    setRecipe(loaded);
    if (loaded) {
      setTitle(loaded.title);
      setDescription(loaded.description ?? '');
      setServings(String(loaded.default_servings));
      setIngredients(loaded.ingredients.map((item) => ({
        name: item.name,
        quantity: String(item.quantity),
        unit: item.unit_code,
      })));
      setInstructions(loaded.steps.map((step) => step.instruction).join('\n'));
    }
  }, [db, id]);

  useEffect(() => {
    loadRecipe().catch(() => undefined);
    listInventory(db)
      .then((items) => setPantryItems(items.map((item) => ({ name: item.name, unit: item.unit_code }))))
      .catch(() => undefined);
  }, [db, loadRecipe]);

  async function saveChanges() {
    const enteredIngredients = ingredients.filter((item) => item.name.trim() || item.quantity.trim());
    if (enteredIngredients.some((item) =>
      !item.name.trim() || !item.quantity.trim() ||
      !Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0,
    )) {
      Alert.alert('Check ingredients', 'Each ingredient needs a name and a valid quantity.');
      return;
    }

    try {
      await updateRecipe(db, id, {
        title,
        description,
        servings: Number(servings),
        ingredients: enteredIngredients.map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity),
          unit: item.unit,
        })),
        steps: instructions.split('\n').map((step) => step.trim()).filter(Boolean),
      });
      await loadRecipe();
      setEditing(false);
      Alert.alert('Recipe updated', 'Your changes have been saved.');
    } catch (error) {
      Alert.alert('Could not update recipe', error instanceof Error ? error.message : 'Please check the recipe details.');
    }
  }

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>‹ Back to recipes</Text>
      </Pressable>

      {editing ? (
        <View style={styles.form}>
          <Text style={styles.title}>Edit recipe</Text>
          <Text style={styles.fieldLabel}>Recipe name</Text>
          <TextInput accessibilityLabel="Recipe title" value={title} onChangeText={setTitle} placeholder="Recipe name" style={styles.input} />
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput accessibilityLabel="Recipe description" value={description} onChangeText={setDescription} placeholder="Optional description" style={styles.input} />
          <Text style={styles.fieldLabel}>Servings</Text>
          <View style={styles.chipRow}>
            {[1, 2, 3, 4, 6, 8, 10, 12].map((count) => (
              <Pressable key={count} accessibilityRole="radio" accessibilityState={{ selected: servings === String(count) }} onPress={() => setServings(String(count))} style={[styles.choiceChip, servings === String(count) ? styles.choiceChipSelected : null]}>
                <Text style={[styles.choiceChipText, servings === String(count) ? styles.choiceChipTextSelected : null]}>{count}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Ingredients</Text>
          {ingredients.map((item, index) => (
            <IngredientEntry
              key={index}
              index={index}
              value={item}
              suggestions={pantryItems}
              onChange={(next) => setIngredients((current) => current.map((entry, entryIndex) => entryIndex === index ? next : entry))}
              onRemove={ingredients.length > 1 ? () => setIngredients((current) => current.filter((_, entryIndex) => entryIndex !== index)) : undefined}
            />
          ))}
          <Pressable accessibilityRole="button" onPress={() => setIngredients((current) => [...current, { name: '', quantity: '', unit: 'item' }])} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>+ Add another ingredient</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Instructions, one step per line</Text>
          <TextInput accessibilityLabel="Recipe instructions" multiline value={instructions} onChangeText={setInstructions} placeholder="Write each step on a new line" style={[styles.input, styles.multiline]} />
          <Pressable accessibilityRole="button" onPress={saveChanges} style={styles.button}>
            <Text style={styles.buttonText}>Save changes</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setEditing(false); loadRecipe().catch(() => undefined); }} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.title}>{recipe.title}</Text>
          {recipe.description ? <Text style={styles.copy}>{recipe.description}</Text> : null}
          <Text style={styles.meta}>Makes {recipe.default_servings} servings</Text>

          <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Edit recipe</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/recipe/[id]/cook', params: { id: recipe.id } })}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Cook this recipe</Text>
          </Pressable>

          <Text style={styles.section}>Ingredients</Text>
          {recipe.ingredients.length === 0 ? <Text style={styles.copy}>No ingredients added yet.</Text> : recipe.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.copy}>{ingredient.name}</Text>
              <Text style={styles.amount}>{ingredient.quantity} {ingredient.unit_code}</Text>
            </View>
          ))}

          <Text style={styles.section}>Instructions</Text>
          {recipe.steps.length === 0 ? <Text style={styles.copy}>No instructions added yet.</Text> : recipe.steps.map((step, index) => (
            <View key={index} style={styles.step}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.copy}>{step.instruction}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  title: { color: colors.text, fontSize: typography.title, fontWeight: '800' },
  copy: { color: colors.muted, lineHeight: 23, fontSize: typography.body },
  link: { color: colors.primary, fontWeight: '700' },
  meta: { color: colors.primary, fontWeight: '700' },
  section: { color: colors.text, fontSize: typography.heading, fontWeight: '800', marginTop: spacing.sm },
  row: { backgroundColor: colors.surface, borderRadius: radii.sm, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  amount: { color: colors.primary, fontWeight: '700' },
  step: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', gap: 12 },
  stepNumber: { color: colors.primary, fontWeight: '800', fontSize: 17 },
  form: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm },
  fieldLabel: { color: colors.text, fontWeight: '700' },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: 14, color: colors.text },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 9 },
  choiceChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceChipText: { color: colors.text, fontWeight: '700' },
  choiceChipTextSelected: { color: '#FFFFFF' },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: radii.md, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  secondaryButton: { borderWidth: 1, borderColor: colors.primary, padding: 13, borderRadius: radii.md, alignItems: 'center' },
  secondaryButtonText: { color: colors.primary, fontWeight: '800' },
});
