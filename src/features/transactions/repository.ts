import type { MovementExportRow } from './movements-csv';

import { database } from '../../infrastructure/storage/database';
import type { NO_CATEGORY_EMOJI, NO_CATEGORY_NAME } from '../categories/category';

export type MovementKind = 'income' | 'expense';

export interface MovementInput {
  kind: MovementKind;
  amountMinor: number;
  note: string;
  categoryId?: number | null;
  transactionDate?: string; // ISO date string YYYY-MM-DD, defaults to today
}

export interface Movement {
  id: number;
  accountId: number;
  kind: MovementKind;
  amountMinor: number;
  note: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryEmoji: string | null;
  transactionDate: string;
  recordedAt: string;
  transferGroup?: string | null;
  excludedFromReports?: number;
  excludedFromCashFlow?: number;
}

/** Load all movements across all accounts, joined with category info, newest first */
export async function loadAllMovements(): Promise<Movement[]> {
  return (await database()).getAllAsync<Movement>(`
    SELECT m.id, m.accountId, m.kind, m.amountMinor, m.note,
           m.categoryId, c.name AS categoryName, c.emoji AS categoryEmoji,
           COALESCE(m.transactionDate, date(m.recordedAt, 'localtime')) AS transactionDate, m.recordedAt,
           m.transferGroup, m.excludedFromReports, m.excludedFromCashFlow
    FROM movements m
    LEFT JOIN categories c ON c.id = m.categoryId
    ORDER BY transactionDate DESC, m.id DESC
  `);
}

/** Load movements for a specific account, newest first */
export async function loadMovements(accountId: number): Promise<Movement[]> {
  return (await database()).getAllAsync<Movement>(`
    SELECT m.id, m.accountId, m.kind, m.amountMinor, m.note,
           m.categoryId, c.name AS categoryName, c.emoji AS categoryEmoji,
           COALESCE(m.transactionDate, date(m.recordedAt, 'localtime')) AS transactionDate, m.recordedAt,
           m.transferGroup, m.excludedFromReports, m.excludedFromCashFlow
    FROM movements m
    LEFT JOIN categories c ON c.id = m.categoryId
    WHERE m.accountId = ?
    ORDER BY transactionDate DESC, m.id DESC
  `, accountId);
}

/** Load recent movements across all accounts (for home screen) */
export async function loadRecentMovements(limit: number = 10): Promise<Movement[]> {
  return (await database()).getAllAsync<Movement>(`
    SELECT m.id, m.accountId, m.kind, m.amountMinor, m.note,
           m.categoryId, c.name AS categoryName, c.emoji AS categoryEmoji,
           COALESCE(m.transactionDate, date(m.recordedAt, 'localtime')) AS transactionDate, m.recordedAt,
           m.transferGroup, m.excludedFromReports, m.excludedFromCashFlow
    FROM movements m
    LEFT JOIN categories c ON c.id = m.categoryId
    ORDER BY transactionDate DESC, m.id DESC
    LIMIT ?
  `, limit);
}

/** Monthly summary: total income and total expense for a given YYYY-MM period */
export async function loadMonthlySummary(period: string): Promise<{ income: number; expense: number }> {
  const rows = await (await database()).getAllAsync<{ kind: MovementKind; total: number }>(
    `SELECT kind, SUM(amountMinor) AS total FROM movements
     WHERE strftime('%Y-%m', transactionDate) = ? AND transferGroup IS NULL AND excludedFromReports = 0 GROUP BY kind`,
    period
  );
  let income = 0; let expense = 0;
  for (const r of rows) {
    if (r.kind === 'income') income = r.total;
    else expense = r.total;
  }
  return { income, expense };
}

export async function recordMovement(accountId: number, movement: MovementInput): Promise<void> {
  const recordedAt = new Date().toISOString();
  const txDate = movement.transactionDate ?? null;
  await (await database()).runAsync(
    `INSERT INTO movements(accountId, kind, amountMinor, note, categoryId, recordedAt, transactionDate)
     VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, date(?, 'localtime')))`,
    accountId, movement.kind, movement.amountMinor, movement.note.trim(),
    movement.categoryId ?? null, recordedAt, txDate, recordedAt
  );
}

// Re-export for backward compat (movement-panel still uses old signature)
export { type NO_CATEGORY_EMOJI, type NO_CATEGORY_NAME };

export async function updateMovement(id: number, accountId: number, movement: MovementInput): Promise<void> {
  const result = await (await database()).runAsync(
    'UPDATE movements SET accountId = ?, kind = ?, amountMinor = ?, note = ?, categoryId = ?, transactionDate = COALESCE(?, transactionDate) WHERE id = ? AND transferGroup IS NULL',
    accountId, movement.kind, movement.amountMinor, movement.note.trim(), movement.categoryId ?? null,
    movement.transactionDate ?? null, id
  );
  if (result.changes !== 1) throw new Error('Movement not found');
}

export async function deleteMovement(id: number): Promise<void> {
  const db = await database();
  db.withTransactionSync(() => {
    const row = db.getFirstSync<{ transferGroup: string | null }>('SELECT transferGroup FROM movements WHERE id = ?', id);
    if (row?.transferGroup) {
      db.runSync('DELETE FROM movements WHERE transferGroup = ?', row.transferGroup);
    } else {
      db.runSync('DELETE FROM movements WHERE id = ?', id);
    }
  });
}

export async function loadMovementsForExport() {
  return (await database()).getAllAsync<MovementExportRow>(`
    SELECT m.id, m.accountId, a.name AS accountName, CASE WHEN a.isCreditCard = 1 THEN 'credit_card' ELSE a.kind END AS accountKind, a.currency,
           m.kind, m.amountMinor, c.name AS categoryName, m.note,
           COALESCE(m.transactionDate, date(m.recordedAt, 'localtime')) AS transactionDate,
           m.recordedAt, m.transferGroup, m.excludedFromReports, m.excludedFromCashFlow
    FROM movements m
    JOIN accounts a ON a.id = m.accountId
    LEFT JOIN categories c ON c.id = m.categoryId
    ORDER BY transactionDate DESC, m.id DESC
  `);
}
