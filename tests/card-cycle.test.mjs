import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardCycleDates, parseBillingDay } from '../src/features/accounts/card-cycle.ts';

test('valida días de tarjeta y permite dejarlos sin configurar', () => {
  assert.equal(parseBillingDay(''), null);
  assert.equal(parseBillingDay('31'), 31);
  assert.equal(parseBillingDay('32'), undefined);
  assert.equal(parseBillingDay('2.5'), undefined);
});

test('estima el pago posterior al corte y ajusta meses cortos y cambios de año', () => {
  assert.deepEqual(cardCycleDates('2028-02-10', 31, 5), { statement: '2028-02-29', payment: '2028-03-05' });
  assert.deepEqual(cardCycleDates('2026-12-31', 20, 5), { statement: '2027-01-20', payment: '2027-02-05' });
  assert.deepEqual(cardCycleDates('2026-11-10', 10, 25), { statement: '2026-11-10', payment: '2026-11-25' });
});
