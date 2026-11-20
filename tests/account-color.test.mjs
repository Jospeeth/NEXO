import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accountColorGradient, normalizeAccountColor } from '../src/features/accounts/account-color.ts';

test('normaliza HEX de seis dígitos y rechaza valores inválidos', () => {
  assert.equal(normalizeAccountColor(' #6d28d9 '), '#6D28D9');
  assert.equal(normalizeAccountColor('ffffff'), '#FFFFFF');
  for (const value of ['', '#fff', '#12345678', 'magenta', '#12G456']) {
    assert.equal(normalizeAccountColor(value), null);
  }
});

test('genera un degradado con contraste para texto blanco incluso en colores extremos', () => {
  function contrast(hex) {
    const channels = [1, 3, 5].map(offset => {
      const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 1.05 / (0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2] + 0.05);
  }
  for (const hex of ['#FFFFFF', '#000000', '#FFFF00', '#6D28D9', '#16A34A']) {
    const [start, end] = accountColorGradient(hex);
    assert.notEqual(start, end);
    assert.ok(contrast(start) >= 4.5);
    assert.ok(contrast(end) >= 4.5);
  }
});
