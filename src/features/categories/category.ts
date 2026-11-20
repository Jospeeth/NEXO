import type { Currency } from '../accounts/account';

export type CategoryKind = 'income' | 'expense' | 'both';

export interface Category {
  id: number;
  name: string;
  emoji: string;
  kind: CategoryKind;
  budgetMinor?: number | null;
  budgetCurrency?: Currency | null;
  monthActualMinor?: number;
}

/** Used when no category is selected */
export const NO_CATEGORY_EMOJI = '📦';
export const NO_CATEGORY_NAME = 'Sin categoría';
