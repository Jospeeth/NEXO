import assert from 'node:assert/strict';
import { test } from 'node:test';
import { homeOverview } from '../src/features/dashboard/home-overview.ts';

const accounts = [
  { id: 1, currency: 'COP', openingMinor: 1000000, balanceMinor: 1300000 },
  { id: 2, currency: 'USD', openingMinor: 1000, balanceMinor: 1000 },
];
const movements = [
  { accountId: 2, kind: 'income', amountMinor: 10, transactionDate: '2026-10-29' },
  { accountId: 2, kind: 'expense', amountMinor: 10, transactionDate: '2026-10-30' },
  { accountId: 1, kind: 'income', amountMinor: 100000, transactionDate: '2026-10-31' },
  { accountId: 1, kind: 'income', amountMinor: 500000, transactionDate: '2026-11-03' },
  { accountId: 1, kind: 'expense', amountMinor: 200000, transactionDate: '2026-11-19' },
  { accountId: 1, kind: 'expense', amountMinor: 100000, transactionDate: '2026-11-19', transferGroup: 'test' },
  { accountId: 2, kind: 'income', amountMinor: 25, transactionDate: '2026-11-19', transferGroup: 'test' },
  { accountId: 2, kind: 'expense', amountMinor: 25, transactionDate: '2026-11-19' },
  { accountId: 1, kind: 'income', amountMinor: 900000, transactionDate: '2026-11-20' },
];
const quote = { rates: { COP: { rate: 4000, date: '2026-11-18' } }, fetchedAt: 1 };

test('consolida ambos saldos y el cierre anterior, y convierte el flujo en ambas direcciones', () => {
  const cop = homeOverview(accounts, movements, '2026-11-19', 'COP', quote);
  assert.equal(cop.balance.minor, 5300000);
  assert.equal(cop.previous.minor, 5100000);
  assert.equal(cop.income.minor, 500000);
  assert.equal(cop.expense.minor, 300000);
  assert.equal(cop.flow[0].income.minor, 0);
  assert.deepEqual(cop.flow.at(-1).expense, cop.expense);

  const usd = homeOverview(accounts, movements, '2026-11-19', 'USD', quote);
  assert.equal(usd.balance.minor, 1325);
  assert.equal(usd.previous.minor, 1275);
  assert.equal(usd.income.minor, 125);
  assert.equal(usd.expense.minor, 75);

  const manual = homeOverview(accounts, movements, '2026-11-19', 'USD', { ...quote, rates: { COP: { rate: 5000, date: '2026-11-18' } } });
  assert.equal(manual.balance.minor, 1260);
  assert.equal(manual.expense.minor, 65);
});

test('distingue una tasa ausente de un saldo cero y conserva los importes que ya están en la moneda elegida', () => {
  const result = homeOverview(accounts, movements, '2026-11-19', 'COP', null);
  assert.equal(result.balance.kind, 'missing-rate');
  assert.equal(result.income.minor, 500000);
  assert.equal(result.expense.kind, 'missing-rate');

  const empty = homeOverview([], [], '2026-11-01', 'USD', null);
  assert.equal(empty.balance.minor, 0);
  assert.equal(empty.trend, null);
  assert.equal(empty.flow.length, 1);
});

test('sincroniza el cierre, las operaciones, el flujo y el consumo de presupuesto de un mes histórico', () => {
  const result = homeOverview(accounts, movements, '2026-11-19', 'COP', quote, '2026-10');
  assert.equal(result.isCurrent, false);
  assert.equal(result.balance.minor, 5100000);
  assert.equal(result.previous.kind, 'historical-unavailable');
  assert.equal(result.expense.minor, 40000);
  assert.deepEqual(result.accountRows.map(row => [row.closing, row.budgetSpent]), [[1100000, 0], [1000, 10]]);
  assert.equal(result.periodMovements.length, 3);
  assert.ok(result.periodMovements.every(item => item.transactionDate.startsWith('2026-10')));
  assert.equal(result.flow.at(-1).day, 31);
  assert.deepEqual(result.flow.at(-1).expense, result.expense);
});

test('un saldo de apertura sin fecha y sin movimientos anteriores deja el cierre histórico indeterminado', () => {
  const result = homeOverview(accounts, movements, '2026-11-19', 'COP', quote, '2026-09');
  assert.equal(result.balance.kind, 'historical-unavailable');
  assert.deepEqual(result.accountRows.map(row => row.closing), [null, null]);
  assert.equal(result.income.minor, 0);
  const future = homeOverview(accounts, movements, '2026-11-19', 'COP', quote, '2026-12');
  assert.equal(future.future, true);
  assert.equal(future.balance.kind, 'historical-unavailable');
  assert.deepEqual(future.periodMovements, []);
  assert.deepEqual(future.flow, []);
});
