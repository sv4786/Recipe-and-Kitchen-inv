import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { changeStock, listInventory, saveInventory } from '@/database/storage';
import { getLowStockItems } from '@/domain/kitchen';
import { IngredientEntry, type IngredientEntryValue } from '@/components/IngredientEntry';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function InventoryScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<Awaited<ReturnType<typeof listInventory>>>([]);
  const [ingredient, setIngredient] = useState<IngredientEntryValue>({ name: '', quantity: '1', unit: 'item' });
  const [minimum, setMinimum] = useState('1');

  const refresh = useCallback(() => { listInventory(db).then(setItems).catch(() => undefined); }, [db]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const lowStockItems = getLowStockItems(items.map((item) => ({
    id: item.id, name: item.name, quantity: item.quantity, minimumQuantity: item.minimum_quantity, unit: item.unit_code, category: item.category,
  })));

  async function saveIngredient() {
    try {
      if (!ingredient.name.trim() || !ingredient.quantity.trim() || !Number.isFinite(Number(ingredient.quantity)) || Number(ingredient.quantity) < 0 || !Number.isFinite(Number(minimum)) || Number(minimum) < 0) {
        Alert.alert('Check ingredient', 'Enter a name and valid non-negative quantities.');
        return;
      }
      await saveInventory(db, { name: ingredient.name, quantity: Number(ingredient.quantity), minimum: Number(minimum), unit: ingredient.unit });
      setIngredient({ name: '', quantity: '1', unit: 'item' });
      setMinimum('1');
      refresh();
    } catch (error) { Alert.alert('Could not save ingredient', error instanceof Error ? error.message : 'Please try again.'); }
  }

  async function adjustStock(inventoryId: string, delta: number) {
    try { await changeStock(db, inventoryId, delta); refresh(); }
    catch (error) { Alert.alert('Could not update stock', error instanceof Error ? error.message : 'Please try again.'); }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Kitchen inventory</Text>
      <Text style={styles.subtitle}>Keep track of what is in the pantry, fridge and freezer.</Text>
      <View style={styles.form}>
        <Text style={styles.heading}>Add or update ingredient</Text>
        <IngredientEntry value={ingredient} onChange={setIngredient} />
        <Text style={styles.fieldLabel}>Minimum stock quantity</Text>
        <TextInput accessibilityLabel="Minimum quantity" placeholder="Minimum quantity" keyboardType="decimal-pad" value={minimum} onChangeText={setMinimum} style={styles.input} />
        <Pressable accessibilityRole="button" onPress={saveIngredient} style={styles.button}><Text style={styles.buttonText}>Save ingredient</Text></Pressable>
      </View>
      <Text style={styles.section}>Needs restocking · {lowStockItems.length}</Text>
      {lowStockItems.map((item) => <View key={item.id} style={styles.low}><Text style={styles.name}>{item.name}</Text><Text style={styles.lowText}>Buy {item.neededQuantity} {item.unit} to reach minimum stock</Text></View>)}
      <Text style={styles.section}>All ingredients · {items.length}</Text>
      {items.length === 0 ? <Text style={styles.copy}>Your pantry is waiting for its first ingredient.</Text> : items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.row}><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{item.quantity} {item.unit_code}</Text></View>
          <Text style={styles.copy}>Minimum {item.minimum_quantity} {item.unit_code}</Text>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" accessibilityLabel={'Decrease ' + item.name + ' stock by one'} onPress={() => adjustStock(item.id, -1)} style={styles.adjust}><Text style={styles.adjustText}>− 1</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={'Increase ' + item.name + ' stock by one'} onPress={() => adjustStock(item.id, 1)} style={styles.adjust}><Text style={styles.adjustText}>+ 1</Text></Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  title: { color: colors.text, fontSize: typography.title, fontWeight: '800' },
  subtitle: { color: colors.muted, lineHeight: 22 },
  form: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm },
  heading: { color: colors.text, fontSize: 16, fontWeight: '700' },
  fieldLabel: { color: colors.text, fontWeight: '700' },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: 13, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'space-between' },
  button: { backgroundColor: colors.primary, padding: 15, borderRadius: radii.sm, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  section: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: spacing.sm },
  low: { backgroundColor: '#F8EBDD', borderRadius: radii.md, padding: spacing.md },
  lowText: { color: colors.warning, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, gap: 8 },
  name: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.primary, fontWeight: '700' },
  copy: { color: colors.muted, fontSize: 12 },
  adjust: { backgroundColor: colors.secondary, paddingVertical: 9, paddingHorizontal: 18, borderRadius: radii.pill },
  adjustText: { color: colors.primary, fontWeight: '700' },
});