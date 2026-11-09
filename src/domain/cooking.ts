import { convertCompatibleQuantity } from './kitchen';

export type CookingLineInput = {
  ingredientId: string;
  name: string;
  requestedQuantity: number;
  recipeUnit: string;
  inventoryId: string | null;
  availableQuantity: number | null;
  inventoryUnit: string | null;
};

export type CookingLineResult = CookingLineInput & {
  deductQuantity: number;
  shortage: number;
  status: 'ready' | 'shortage' | 'untracked' | 'incompatible';
};

export function buildCookingLine(
  input: CookingLineInput,
): CookingLineResult {
  if (
    !input.inventoryId ||
    input.availableQuantity === null ||
    !input.inventoryUnit
  ) {
    return {
      ...input,
      deductQuantity: 0,
      shortage: 0,
      status: 'untracked',
    };
  }

  const convertedQuantity = convertCompatibleQuantity(
    input.requestedQuantity,
    input.recipeUnit,
    input.inventoryUnit,
  );

  if (convertedQuantity === null) {
    return {
      ...input,
      deductQuantity: 0,
      shortage: 0,
      status: 'incompatible',
    };
  }

  const deductQuantity = Math.min(
    input.availableQuantity,
    convertedQuantity,
  );
  const shortage = Math.max(
    0,
    convertedQuantity - input.availableQuantity,
  );

  return {
    ...input,
    deductQuantity,
    shortage,
    status: shortage > 0 ? 'shortage' : 'ready',
  };
}
