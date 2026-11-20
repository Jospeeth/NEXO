import type { SQLiteBindValue } from 'expo-sqlite';
import { localDay } from '../../shared/date/local-day';
import { database } from '../../infrastructure/storage/database';
import type { Category, CategoryKind } from './category';

export async function loadCategories(kind?: CategoryKind): Promise<Category[]> {
  const today = localDay();
  return (await database()).getAllAsync<Category>(`
    SELECT c.*, COALESCE((
      SELECT SUM(m.amountMinor) FROM movements m JOIN accounts a ON a.id = m.accountId
      WHERE m.categoryId = c.id AND a.currency = c.budgetCurrency
        AND m.transferGroup IS NULL AND m.excludedFromReports = 0
        AND m.kind = CASE WHEN c.kind = 'income' THEN 'income' ELSE 'expense' END
        AND COALESCE(m.transactionDate, date(m.recordedAt, 'localtime')) BETWEEN ? AND ?
    ), 0) AS monthActualMinor
    FROM categories c
    WHERE (? IS NULL OR c.kind = ? OR c.kind = 'both')
    ORDER BY c.name
  `, today.slice(0, 7) + '-01', today, kind ?? null, kind ?? null);
}

type CategoryInput = Pick<Category, 'name' | 'emoji' | 'kind' | 'budgetMinor' | 'budgetCurrency'>;

export async function createCategory(
  input: CategoryInput
): Promise<number> {
  const result = await (await database()).runAsync(
    'INSERT INTO categories(name, emoji, kind, budgetMinor, budgetCurrency) VALUES (?, ?, ?, ?, ?)',
    input.name.trim(), input.emoji, input.kind, input.budgetMinor ?? null, input.budgetCurrency ?? null
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  id: number,
  input: Partial<CategoryInput>
): Promise<void> {
  const fields: string[] = [];
  const values: SQLiteBindValue[] = [];
  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name.trim()); }
  if (input.emoji !== undefined) { fields.push('emoji = ?'); values.push(input.emoji); }
  if (input.kind !== undefined) { fields.push('kind = ?'); values.push(input.kind); }
  if (input.budgetMinor !== undefined) {
    fields.push('budgetMinor = ?', 'budgetCurrency = ?');
    values.push(input.budgetMinor, input.budgetMinor === null ? null : input.budgetCurrency ?? null);
  }
  if (fields.length === 0) return;
  values.push(id);
  await (await database()).runAsync(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await database();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE movements SET categoryId = NULL WHERE categoryId = ?', id);
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  });
}
