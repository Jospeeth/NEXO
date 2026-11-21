import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exchangeRate, parseCatalog, parseRates } from '../src/features/exchange/rate.ts';

test('valida tasas históricas y convierte entre monedas sin cambiar la base almacenada', () => {
  const quote = parseRates([
    { base: 'USD', quote: 'COP', date: '2026-10-30', rate: 4000 },
    { base: 'USD', quote: 'COP', date: '2026-11-02', rate: 4200 },
    { base: 'USD', quote: 'EUR', date: '2026-10-31', rate: 0.8 },
    { base: 'USD', quote: 'GBP', date: '2026-10-31', rate: 0 },
  ], 1, '2026-10-31');
  assert.equal(exchangeRate(quote, 'EUR', 'COP'), 5000);
  assert.equal(quote.rates.COP.date, '2026-10-30');
  assert.equal(exchangeRate(quote, 'GBP', 'COP'), null);
  assert.throws(() => parseRates([{ base: 'USD', quote: 'COP', rate: -1 }], 1, '2026-11-21'));
});

test('acepta solo monedas del catálogo por código ISO y excluye criptoactivos', () => {
  assert.deepEqual(parseCatalog([
    { iso_code: 'EUR', name: 'Euro', type: 'currency' },
    { iso_code: 'BTC', name: 'Bitcoin', type: 'crypto' },
    { iso_code: 'CAD', name: 'Canadian Dollar' },
    { iso_code: 'EUR', name: 'Euro' },
  ]).map(row => row.iso_code), ['CAD', 'EUR']);
});
