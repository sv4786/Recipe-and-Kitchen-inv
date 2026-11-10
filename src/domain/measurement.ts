export const measurementUnits = [
  { code: 'g', label: 'g' },
  { code: 'kg', label: 'kg' },
  { code: 'ml', label: 'ml' },
  { code: 'l', label: 'L' },
  { code: 'tsp', label: 'tsp' },
  { code: 'tbsp', label: 'tbsp' },
  { code: 'cup', label: 'cup' },
  { code: 'item', label: 'item' },
] as const;

export type MeasurementUnit = (typeof measurementUnits)[number]['code'];

export function normalizeMeasurementUnit(value: string): MeasurementUnit | null {
  const normalized = value.trim().toLocaleLowerCase();
  return measurementUnits.some((unit) => unit.code === normalized)
    ? (normalized as MeasurementUnit)
    : null;
}
