import type { SQLiteDatabase } from 'expo-sqlite';

const columns = {
  accounts: ['id', 'name', 'kind', 'currency', 'openingMinor', 'openingDate', 'color', 'icon', 'note', 'isArchived', 'isCreditCard', 'budgetMinor', 'statementDay', 'paymentDay', 'cardProfile'],
  categories: ['id', 'name', 'emoji', 'kind', 'budgetMinor', 'budgetCurrency'],
  movements: ['id', 'accountId', 'kind', 'amountMinor', 'note', 'recordedAt', 'transactionDate',
    'categoryId', 'transferGroup', 'excludedFromReports', 'excludedFromCashFlow', 'feeOccurrence'],
} as const;
const legacyColumnCounts = { accounts: [12, 14], categories: [], movements: [11] } as const;
const tables = ['accounts', 'categories', 'movements'] as const;

type BackupValue = string | number | null;
type BackupRows = Record<typeof tables[number], BackupValue[][]>;

export interface LedgerBackup {
  format: 'nexo-ledger';
  version: 1;
  rows: BackupRows;
}

export function parseLedgerBackup(value: unknown): LedgerBackup {
  if (typeof value !== 'object' || value === null || !('format' in value) ||
      value.format !== 'nexo-ledger' || !('version' in value) || value.version !== 1 ||
      !('rows' in value) || typeof value.rows !== 'object' || value.rows === null) {
    throw new Error('Invalid backup');
  }
  const rows = value.rows as Record<string, unknown>;
  for (const table of tables) {
    const items = rows[table];
    if (!Array.isArray(items) || items.some(row => !Array.isArray(row) || (row.length !== columns[table].length && !(legacyColumnCounts[table] as readonly number[]).includes(row.length)) ||
      !Number.isSafeInteger(row[0]) || row[0] <= 0 ||
      row.some(cell => cell !== null && typeof cell !== 'string' && !Number.isSafeInteger(cell)))) {
      throw new Error('Invalid backup rows');
    }
  }
  const validated = rows as BackupRows;
  return { format: 'nexo-ledger', version: 1, rows: {
    ...validated,
    accounts: validated.accounts.map(row => [...row, ...Array<null>(columns.accounts.length - row.length).fill(null)]),
    movements: validated.movements.map(row => [...row, ...Array<null>(columns.movements.length - row.length).fill(null)]),
  } };
}

export function readLedgerBackup(db: SQLiteDatabase): LedgerBackup {
  const rows: BackupRows = { accounts: [], categories: [], movements: [] };
  db.execSync('BEGIN');
  try {
    for (const table of tables) {
      rows[table] = db.getAllSync<Record<string, BackupValue>>(
        `SELECT ${columns[table].join(', ')} FROM ${table} ORDER BY id`,
      ).map(row => columns[table].map(column => row[column] ?? null));
    }
    db.execSync('COMMIT');
    return { format: 'nexo-ledger', version: 1, rows };
  } catch (error) {
    db.execSync('ROLLBACK');
    throw error;
  }
}

export function restoreLedgerBackup(db: SQLiteDatabase, backup: LedgerBackup) {
  db.execSync('BEGIN IMMEDIATE');
  try {
    db.execSync('DELETE FROM movements; DELETE FROM accounts; DELETE FROM categories;');
    for (const table of tables) {
      const fields = columns[table];
      const statement = db.prepareSync(
        `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
      );
      try {
        for (const row of backup.rows[table]) statement.executeSync(row);
      } finally {
        statement.finalizeSync();
      }
    }
    db.execSync('COMMIT');
  } catch (error) {
    db.execSync('ROLLBACK');
    throw error;
  }
}
