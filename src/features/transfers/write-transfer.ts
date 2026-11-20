import type { SQLiteDatabase } from 'expo-sqlite';

export interface TransferInput {
  fromId: number;
  toId: number;
  amountMinor: number;
  date: string;
  note: string;
}

export function writeTransfer(db: SQLiteDatabase, input: TransferInput, group: string, recordedAt: string) {
  const { fromId, toId, amountMinor, date } = input;
  const note = input.note.trim();
  const day = new Date(date + 'T00:00:00Z');
  if (fromId === toId || !Number.isSafeInteger(amountMinor) || amountMinor < 1 || amountMinor > 99999999999999 ||
    note.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(day.valueOf()) ||
    day.toISOString().slice(0, 10) !== date) throw new Error('Invalid transfer');

  db.withTransactionSync(() => {
    const accounts = db.getAllSync<{ currency: string }>(
      'SELECT currency FROM accounts WHERE id IN (?, ?) AND isArchived = 0',
      fromId, toId
    );
    if (accounts.length !== 2 || accounts[0]?.currency !== accounts[1]?.currency) {
      throw new Error('Transfer requires two accounts in the same currency');
    }
    db.runSync(`
      INSERT INTO movements(accountId, kind, amountMinor, note, recordedAt, transactionDate,
        transferGroup, excludedFromReports, excludedFromCashFlow)
      VALUES (?, 'expense', ?, ?, ?, ?, ?, 1, 1), (?, 'income', ?, ?, ?, ?, ?, 1, 1)
    `, fromId, amountMinor, note, recordedAt, date, group, toId, amountMinor, note, recordedAt, date, group);
  });
}
