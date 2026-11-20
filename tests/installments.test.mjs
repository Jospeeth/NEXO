import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixedPaymentPlan, paymentDate } from '../src/features/installments/plan.ts';

test('amortiza capital una sola vez y ajusta el saldo final', () => {
  const plan = fixedPaymentPlan(120000000, 6, 0.02, '2026-12-20');
  assert.equal(plan.estimated, 21423097);
  assert.equal(Math.round(plan.interest / 100), 85386);
  assert.equal(Math.round(plan.total / 100), 1285386);
  assert.equal(plan.rows.reduce((sum, row) => sum + row.capital, 0), 120000000);
  assert.equal(plan.rows.at(-1).remaining, 0);
  assert.equal(plan.rows.at(-1).date, '2027-05-20');
});

test('calcula cuotas sin interés y conserva el día cuando termina un mes corto', () => {
  const plan = fixedPaymentPlan(1000, 3, 0, '2028-01-31');
  assert.equal(plan.total, 1000);
  assert.equal(plan.interest, 0);
  assert.deepEqual(plan.rows.map(row => row.payment), [333, 333, 334]);
  assert.equal(paymentDate('2028-01-31', 1), '2028-02-29');
  assert.equal(paymentDate('2028-01-31', 2), '2028-03-31');
  assert.equal(fixedPaymentPlan(1000, 0, 0, '2028-01-31'), null);
});
