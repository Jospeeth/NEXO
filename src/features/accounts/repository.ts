import { selectAccountsWithBalances } from './schema';
import { database } from '../../infrastructure/storage/database';
import { normalizeAccountColor } from './account-color';
import { localDay } from '../../shared/date/local-day';
import type { AccountDetails, SavedAccount } from './account';
import type { SQLiteBindValue } from 'expo-sqlite';

export async function loadAccounts(): Promise<SavedAccount[]> {
  const today = localDay();
  return (await database()).getAllAsync<SavedAccount>(selectAccountsWithBalances, today.slice(0, 7) + '-01', today);
}

function validatedColor(color: string | null | undefined) {
  if (color == null) return null;
  const normalized = normalizeAccountColor(color);
  if (!normalized) throw new Error('Invalid account color');
  return normalized;
}

export async function createAccount(account: AccountDetails): Promise<number> {
  const result = await (await database()).runAsync(
    'INSERT INTO accounts(name, kind, currency, openingMinor, color, isCreditCard, budgetMinor) VALUES (?, ?, ?, ?, ?, ?, ?)',
    account.name.trim(), account.kind === 'credit_card' ? 'credit' : account.kind,
    account.currency, account.openingMinor, validatedColor(account.color), account.kind === 'credit_card' ? 1 : 0,
    account.kind === 'credit_card' ? account.budgetMinor ?? null : null
  );
  return result.lastInsertRowId;
}

export async function updateAccount(
  id: number,
  input: Partial<AccountDetails>
): Promise<void> {
  const fields: string[] = [];
  const values: SQLiteBindValue[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name.trim());
  }
  if (input.kind !== undefined) {
    fields.push('kind = ?', 'isCreditCard = ?');
    values.push(input.kind === 'credit_card' ? 'credit' : input.kind, input.kind === 'credit_card' ? 1 : 0);
  }
  if (input.currency !== undefined) {
    fields.push('currency = ?');
    values.push(input.currency);
  }
  if (input.openingMinor !== undefined) {
    fields.push('openingMinor = ?');
    values.push(input.openingMinor);
  }

  if (input.color !== undefined) {
    fields.push('color = ?');
    values.push(validatedColor(input.color));
  }

  const budget = input.kind !== undefined && input.kind !== 'credit_card' ? null : input.budgetMinor;
  if (budget !== undefined) {
    fields.push('budgetMinor = ?');
    values.push(budget);
  }

  if (fields.length === 0) return;
  values.push(id);

  await (await database()).runAsync(
    `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );
}

export async function deleteAccount(id: number): Promise<void> {
  const db = await database();
  await db.withTransactionAsync(async () => {
    const transfer = await db.getFirstAsync('SELECT id FROM movements WHERE accountId = ? AND transferGroup IS NOT NULL LIMIT 1', id);
    if (transfer) throw new Error('Account has linked transfers');
    await db.runAsync('DELETE FROM movements WHERE accountId = ?', id);
    await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
  });
}
