import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarize } from '../src/features/dashboard/summary.ts';

const accounts = [
  { id: 1, currency: 'COP', openingMinor: 10000, balanceMinor: 25000 },
  { id: 2, currency: 'USD', openingMinor: 1000, balanceMinor: 3000 },
];
const movements = [
  { accountId: 1, kind: 'income', amountMinor: 12000, transactionDate: '2026-10-31' },
  { accountId: 1, kind: 'expense', amountMinor: 2000, transactionDate: '2026-11-01' },
  { accountId: 1, kind: 'income', amountMinor: 5000, transactionDate: '2026-11-19' },
  { accountId: 1, kind: 'expense', amountMinor: 900, transactionDate: '2026-11-20' },
  { accountId: 2, kind: 'income', amountMinor: 2000, transactionDate: '2026-11-19' },
];
const summary = period => summarize(accounts, movements, period, 'COP', '2026-11-19');

test('el cierre anterior pasa al saldo inicial y queda fuera del flujo del mes', () => {
  const october = summary('2026-10');
  const november = summary('2026-11');
  assert.equal(october.closingBalance, 22000);
  assert.equal(november.openingBalance, october.closingBalance);
  assert.equal(november.income, 5000);
  assert.equal(november.expense, 2000);
  assert.equal(november.closingBalance, 25000);
  assert.equal(october.available, november.available);
  assert.equal(october.isCurrentPeriod, false);
  assert.equal(november.isCurrentPeriod, true);
});

test('un mes sin movimientos conserva el saldo y un mes futuro no tiene cierre', () => {
  const september = summary('2026-09');
  assert.equal(september.openingBalance, 10000);
  assert.equal(september.closingBalance, 10000);
  assert.equal(summary('2026-12').closingBalance, null);
});
