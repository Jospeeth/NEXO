import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { bogotaSlot, isStale, parseRate } from '../src/features/exchange/rate.ts';

test('las franjas cambian a medianoche, 08:00 y 16:00 en Bogotá', () => {
  const start = Date.parse('2026-11-19T05:00:00Z');
  const slot = bogotaSlot(start);
  assert.equal(bogotaSlot(start - 1), slot - 1);
  assert.equal(bogotaSlot(start + 8 * 3_600_000 - 1), slot);
  assert.equal(bogotaSlot(start + 8 * 3_600_000), slot + 1);
  assert.equal(bogotaSlot(start + 16 * 3_600_000), slot + 2);
  assert.equal(bogotaSlot(start + 31 * 24 * 3_600_000) - slot, 93);
});

test('deriva USD/COP desde la misma base y conserva la hora del proveedor', () => {
  const now = Date.parse('2026-11-19T17:00:00Z');
  const payload = { success: true, timestamp: now / 1000, rates: { USD: 1.25, COP: 5000 } };
  const quote = parseRate(payload, now);
  assert.deepEqual(quote, { copPerUsd: 4000, quotedAt: now });
  assert.equal(isStale(quote, now + 24 * 3_600_000), true);
  assert.throws(() => parseRate({ ...payload, rates: { USD: 0, COP: 5000 } }, now));
  assert.throws(() => parseRate({ ...payload, success: false }, now));
});
