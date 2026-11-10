import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { measurementUnits } from '@/domain/measurement';

export type IngredientEntryValue = {
  name: string;
  quantity: string;
  unit: string;
};

type IngredientEntryProps = {
  value: IngredientEntryValue;
  onChange: (value: IngredientEntryValue) => void;
  onRemove?: () => void;
  index?: number;
  suggestions?: string[];
};

export function IngredientEntry({ value, onChange, onRemove, index, suggestions = [] }: IngredientEntryProps) {
  function update(patch: Partial<IngredientEntryValue>) {
    onChange({ ...value, ...patch });
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>Ingredient {index === undefined ? '' : index + 1}</Text>
        {onRemove ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ingredient ${index === undefined ? '' : index + 1}`} onPress={onRemove}>
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        accessibilityLabel="Ingredient name"
        placeholder="e.g. Flour"
        value={value.name}
        onChangeText={(name) => update({ name })}
        style={styles.input}
        returnKeyType="next"
      />
      {suggestions.length > 0 ? (
        <View style={styles.suggestionSection}>
          <Text style={styles.unitLabel}>From your pantry</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {suggestions.filter((name) => name.toLocaleLowerCase() !== value.name.trim().toLocaleLowerCase()).map((name) => (
              <Pressable key={name} accessibilityRole="button" onPress={() => update({ name })} style={styles.suggestionChip}>
                <Text style={styles.suggestionText}>{name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View style={styles.quantityRow}>
        <TextInput
          accessibilityLabel="Ingredient quantity"
          placeholder="Amount"
          keyboardType="decimal-pad"
          value={value.quantity}
          onChangeText={(quantity) => update({ quantity })}
          style={[styles.input, styles.quantity]}
        />
        <Text style={styles.unitLabel}>Unit</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
        {measurementUnits.map((unit) => {
          const selected = value.unit === unit.code;
          return (
            <Pressable
              key={unit.code}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => update({ unit: unit.code })}
              style={[styles.chip, selected ? styles.chipSelected : null]}
            >
              <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>{unit.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.text,
    fontWeight: '700',
  },
  remove: {
    color: colors.danger,
    fontWeight: '700',
    padding: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 13,
    color: colors.text,
    minWidth: 0,
  },
  suggestionSection: { gap: 6 },
  suggestionChip: { backgroundColor: colors.sage, borderRadius: radii.pill, paddingHorizontal: 13, paddingVertical: 8 },
  suggestionText: { color: colors.primary, fontWeight: '700' },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quantity: {
    flex: 1,
  },
  unitLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  chips: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
