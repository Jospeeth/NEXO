import assert from 'node:assert/strict';
import { test } from 'node:test';
import { annualFee, metallicFinishes, nextFeeDate, readCardProfile } from '../src/features/accounts/card-profile.ts';
import { canonicalInstitution, creditProduct, institutionSearch } from '../src/features/accounts/institutions.ts';

test('conserva los acabados originales y agrega la paleta ampliada y normaliza entidades por mayúsculas y acentos', () => {
  assert.equal(Object.keys(metallicFinishes).length, 16);
  for (const finish of ['obsidian', 'orange', 'green', 'yellow']) assert.ok(metallicFinishes[finish]);
  assert.equal(canonicalInstitution(' banco de bogota '), 'Banco de Bogotá');
  assert.equal(institutionSearch('Ualá'), 'uala');
  assert.equal(canonicalInstitution('rappi card'), 'RappiCard');
  assert.equal(creditProduct('RappiCard').issuer, 'Banco Davivienda S.A.');
  assert.equal(creditProduct('Rappi'), undefined);
});

test('proyecta cuotas sin escribir gastos y conserva el día al pasar por un mes corto', () => {
  const fee = { minor: 3200000, currency: 'COP', frequency: 'monthly', start: '2026-12-31',
    next: '2026-12-31', waiverUntil: '2027-01-31' };
  assert.equal(annualFee(fee), 38400000);
  assert.equal(nextFeeDate(fee, '2026-12-31', new Set()), '2027-02-28');
  assert.equal(nextFeeDate(fee, '2027-02-28', new Set(['2027-02-28'])), '2027-03-31');
});

test('lee metadatos de tarjeta y mantiene configuraciones anteriores vacías', () => {
  assert.deepEqual(readCardProfile(null), {});
  assert.equal(readCardProfile('{"finish":"arctic","lastFour":"0042"}').lastFour, '0042');
  assert.equal(readCardProfile('{"finish":"invalid","lastFour":"123456"}').finish, undefined);
});
