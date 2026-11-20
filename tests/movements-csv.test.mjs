import assert from 'node:assert/strict';
import { test } from 'node:test';
import { movementsCsv } from '../src/features/transactions/movements-csv.ts';

test('exporta varias cuentas y monedas con importes exactos y texto escapado', () => {
  const row = {
    id: 1, accountId: 10, accountName: 'Cuenta "Personal", principal', accountKind: 'checking',
    currency: 'COP', kind: 'expense', amountMinor: 100005, categoryName: 'Café',
    note: 'Compra\nen tienda', transactionDate: '2026-11-19', recordedAt: '2026-11-20T01:00:00Z',
  };
  const csv = movementsCsv([row, {
    ...row, id: 2, accountId: 20, accountName: 'USD', currency: 'USD',
    kind: 'income', amountMinor: 2, note: ' =1+2', categoryName: null,
  }]);
  assert.ok(csv.startsWith('\uFEFFID,Fecha,Tipo'));
  assert.ok(csv.includes(',"Cuenta ""Personal"", principal","checking",COP,-1000.05,"Café","Compra\nen tienda",'));
  assert.ok(csv.includes(',"USD","checking",USD,0.02,"Sin categoría","\' =1+2",'));
  assert.ok(csv.endsWith('\r\n'));
});

test('el CSV de cuentas conserva los identificadores y saldos con signo', async () => {
  const { accountsCsv } = await import('../src/features/accounts/accounts-csv.ts');
  const csv = accountsCsv([
    { id: 10, name: 'Tarjeta', kind: 'credit', currency: 'COP', openingMinor: 0, balanceMinor: -100005 },
    { id: 20, name: 'Ahorros', kind: 'savings', currency: 'USD', openingMinor: 250050, balanceMinor: 260000, color: '#6D28D9' },
  ]);
  assert.ok(csv.includes('10,"Tarjeta","credit",COP,0.00,-1000.05,""\r\n'));
  assert.ok(csv.includes('20,"Ahorros","savings",USD,2500.50,2600.00,"#6D28D9"\r\n'));
});
