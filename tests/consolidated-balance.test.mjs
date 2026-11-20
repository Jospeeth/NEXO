import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consolidatedBalance } from '../src/features/dashboard/consolidated-balance.ts';

const quote = { copPerUsd: 4000, quotedAt: 1 };
const accounts = [
  { currency: 'USD', balanceMinor: 10000 },
  { currency: 'COP', balanceMinor: 20000000 },
  { currency: 'USD', balanceMinor: -2500 },
];

test('consolida ambas monedas y descuenta saldos negativos', () => {
  assert.deepEqual(consolidatedBalance(accounts, 'COP', quote),
    { kind: 'available', minor: 50000000, usedQuote: true });
  assert.deepEqual(consolidatedBalance(accounts, 'USD', quote),
    { kind: 'available', minor: 12500, usedQuote: true });
});

test('requiere una tasa cuando hay conversión y detecta monedas sin cobertura', () => {
  assert.equal(consolidatedBalance(accounts, 'USD', null).kind, 'missing-rate');
  assert.equal(consolidatedBalance([{ currency: 'EUR', balanceMinor: 500 }], 'COP', quote).kind, 'unsupported-currency');
  assert.deepEqual(consolidatedBalance([{ currency: 'COP', balanceMinor: 500 }], 'COP', null),
    { kind: 'available', minor: 500, usedQuote: false });
});
