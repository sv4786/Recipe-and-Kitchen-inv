import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  addManualItem,
  listInventory,
  manualItems,
  recordIngredientPurchase,
  toggleManualItem,
} from '@/database/storage';
import { getLowStockItems } from '@/domain/kitchen';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function ShoppingScreen() {
  const db = useSQLiteContext();
  const [manual, setManual] = useState<Awaited<ReturnType<typeof manualItems>>>([]);
  const [inventory, setInventory] = useState<Awaited<ReturnType<typeof listInventory>>>([]);
  const [newItem, setNewItem] = useState('');
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState('');
  const [purchaseUnit, setPurchaseUnit] = useState('');

  const refresh = useCallback(() => {
    Promise.all([manualItems(db), listInventory(db)])
      .then(([manualItems, inventoryItems]) => {
        setManual(manualItems);
        setInventory(inventoryItems);
      })
      .catch(() => undefined);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const automaticItems = getLowStockItems(
    inventory.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      minimumQuantity: item.minimum_quantity,
      unit: item.unit_code,
      category: item.category,
    })),
  );

  async function addShoppingItem() {
    try {
      await addManualItem(db, newItem);
      setNewItem('');
      refresh();
    } catch (error) {
      Alert.alert(
        'Could not add item',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }

  async function recordPurchase(inventoryId: string) {
    try {
      await recordIngredientPurchase(
        db,
        inventoryId,
        Number(purchaseQuantity),
        purchaseUnit,
      );

      setPurchaseId(null);
      setPurchaseQuantity('');
      setPurchaseUnit('');
      refresh();
    } catch (error) {
      Alert.alert(
        'Could not record purchase',
        error instanceof Error
          ? error.message
          : 'Please check the quantity and unit.',
      );
    }
  }

  function openPurchaseForm(
    inventoryId: string,
    suggestedQuantity: number,
    unit: string,
  ) {
    setPurchaseId(inventoryId);
    setPurchaseQuantity(String(suggestedQuantity));
    setPurchaseUnit(unit);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Shopping list</Text>
      <Text style={styles.subtitle}>
        Low-stock essentials, alongside anything else you need.
      </Text>

      <Text style={styles.section}>
        Automatically needed · {automaticItems.length}
      </Text>

      {automaticItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emoji}>🌿</Text>
          <Text style={styles.heading}>Your shelves are looking good</Text>
          <Text style={styles.copy}>
            When a tracked ingredient falls below its minimum, it appears here
            automatically.
          </Text>
        </View>
      ) : (
        automaticItems.map((item) => (
          <View key={item.id} style={styles.low}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.neededQuantity > 0\n                  ? `Need ${item.neededQuantity} ${item.unit}`\n                  : `At minimum · restock ${item.minimumQuantity} ${item.unit}`}
              </Text>
            </View>

            <Text style={styles.copy}>
              Current {item.quantity} · Minimum {item.minimumQuantity}
            </Text>

            {purchaseId === item.id ? (
              <View style={styles.purchase}>
                <TextInput
                  accessibilityLabel="Actual purchased quantity"
                  keyboardType="decimal-pad"
                  placeholder="Actual quantity bought"
                  value={purchaseQuantity}
                  onChangeText={setPurchaseQuantity}
                  style={styles.input}
                />

                <TextInput
                  accessibilityLabel="Purchase unit"
                  placeholder={item.unit}
                  value={purchaseUnit}
                  onChangeText={setPurchaseUnit}
                  style={styles.input}
                />

                <View style={styles.row}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => recordPurchase(item.id)}
                    style={styles.add}
                  >
                    <Text style={styles.addText}>Save purchase</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPurchaseId(null)}
                  >
                    <Text style={styles.cancel}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  openPurchaseForm(
                    item.id,
                    item.neededQuantity,
                    item.unit,
                  )
                }
                style={styles.purchaseButton}
              >
                <Text style={styles.purchaseButtonText}>
                  Record actual purchase
                </Text>
              </Pressable>
            )}
          </View>
        ))
      )}

      <Text style={styles.section}>Add something else</Text>

      <View style={styles.row}>
        <TextInput
          accessibilityLabel="Manual shopping item"
          placeholder="e.g. Dish soap"
          value={newItem}
          onChangeText={setNewItem}
          style={styles.input}
        />

        <Pressable
          accessibilityRole="button"
          onPress={addShoppingItem}
          style={styles.add}
        >
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>
        Your list · {manual.filter((item) => !item.is_completed).length}
      </Text>

      {manual.length === 0 ? (
        <Text style={styles.copy}>No extra items added.</Text>
      ) : (
        manual.map((item) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: Boolean(item.is_completed) }}
            key={item.id}
            onPress={async () => {
              await toggleManualItem(db, item.id, !item.is_completed);
              refresh();
            }}
            style={styles.manual}
          >
            <Text style={styles.check}>
              {item.is_completed ? '✓' : '○'}
            </Text>
            <Text
              style={[
                styles.name,
                item.is_completed ? styles.done : null,
              ]}
            >
              {item.name}
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
  section: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  low: {
    backgroundColor: colors.sage,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  meta: {
    color: colors.primary,
    fontWeight: '800',
  },
  copy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
  },
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
  heading: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 13,
    color: colors.text,
  },
  add: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  purchaseButton: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: 11,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  purchase: {
    gap: 8,
  },
  cancel: {
    color: colors.muted,
    padding: 10,
  },
  manual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  check: {
    color: colors.primary,
    fontSize: 20,
    width: 22,
  },
  done: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
});
