import { measurementUnits, normalizeMeasurementUnit } from '../src/domain/measurement';

describe('measurement units', () => {
  it('offers the units supported by kitchen quantity conversion', () => {
    expect(measurementUnits.map((unit) => unit.code)).toEqual([
      'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'item',
    ]);
  });

  it('normalizes a selected unit and rejects unsupported free text', () => {
    expect(normalizeMeasurementUnit(' ML ')).toBe('ml');
    expect(normalizeMeasurementUnit('scoop')).toBeNull();
  });
});
