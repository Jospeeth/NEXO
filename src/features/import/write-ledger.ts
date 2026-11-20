import type { SQLiteDatabase } from 'expo-sqlite';
import type { ImportPlan } from './parker-csv';

export function writeLedger(db: SQLiteDatabase, plan: ImportPlan) {
  if (!plan.accounts.length || !plan.movements.length) throw new Error('Empty import');
  // Acquire ownership before the rollback handler so a failed BEGIN cannot roll back another operation.
  db.execSync('BEGIN IMMEDIATE');
  try {
    db.execSync('DELETE FROM movements; DELETE FROM accounts; DELETE FROM categories;');
    const accounts = new Map<string, number>();
    const categories = new Map<string, number>();

    const insertAccount = db.prepareSync(
      "INSERT INTO accounts(name, kind, currency, openingMinor) VALUES (?, 'checking', ?, 0)"
    );
    const insertCategory = db.prepareSync('INSERT INTO categories(name, emoji, kind) VALUES (?, ?, ?)');
    const insertMovement = db.prepareSync(`
      INSERT INTO movements(accountId, kind, amountMinor, note, recordedAt, transactionDate, categoryId,
        transferGroup, excludedFromReports, excludedFromCashFlow) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      for (const account of plan.accounts) {
        accounts.set(account.key, insertAccount.executeSync(account.name, account.currency).lastInsertRowId);
      }
      for (const category of plan.categories) {
        categories.set(category.key, insertCategory.executeSync(category.name, '📦', category.kind).lastInsertRowId);
      }
      for (const movement of plan.movements) {
        const accountId = accounts.get(movement.accountKey);
        const categoryId = categories.get(movement.categoryKey);
        if (accountId === undefined || (movement.categoryKey && categoryId === undefined)) {
          throw new Error('Missing import reference');
        }
        insertMovement.executeSync(accountId, movement.kind, movement.amountMinor, movement.note, movement.recordedAt,
          movement.date, categoryId ?? null, movement.transferGroup || null,
          Number(movement.excludeReports), Number(movement.excludeCashFlow));
      }
    } finally {
      insertMovement.finalizeSync();
      insertCategory.finalizeSync();
      insertAccount.finalizeSync();
    }
    db.execSync('COMMIT');
  } catch (error) {
    if (db.isInTransactionSync()) db.execSync('ROLLBACK');
    throw error;
  }
}
