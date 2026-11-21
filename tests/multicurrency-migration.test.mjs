import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { firstMigration, secondMigration } from '../src/features/accounts/schema.ts';
import { thirdMigration } from '../src/infrastructure/storage/migration-v3.ts';
import { fourthMigration } from '../src/infrastructure/storage/migration-v4.ts';
import { fifthMigration } from '../src/infrastructure/storage/migration-v5.ts';
import { sixthMigration } from '../src/infrastructure/storage/migration-v6.ts';
import { seventhMigration } from '../src/infrastructure/storage/migration-v7.ts';
import { eighthMigration } from '../src/infrastructure/storage/migration-v8.ts';

test('v8 amplía las monedas y conserva cuentas, movimientos, categorías y días de tarjeta', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON');
    db.exec(firstMigration + secondMigration + thirdMigration + fourthMigration + fifthMigration + sixthMigration + seventhMigration);
    db.exec(`
      INSERT INTO accounts(id,name,kind,currency,openingMinor,isCreditCard,statementDay,paymentDay)
        VALUES(42,'Tarjeta','credit','COP',-950,1,10,25);
      INSERT INTO movements(id,accountId,kind,amountMinor,note,recordedAt,categoryId,transferGroup)
        VALUES(19,42,'expense',30,'Prueba','2026-11-20',1,'T1');
    `);
    const tables = ['accounts', 'categories', 'movements'];
    const before = tables.map(table => db.prepare('SELECT * FROM ' + table).all());
    db.exec('BEGIN; ' + eighthMigration + ' COMMIT;');
    assert.deepEqual(tables.map(table => db.prepare('SELECT * FROM ' + table).all()), before);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    db.exec("INSERT INTO accounts(name,kind,currency,openingMinor) VALUES('Efectivo','cash','GBP',100)");
    db.exec("UPDATE categories SET budgetCurrency='GBP', budgetMinor=500 WHERE id=1");
    assert.throws(() => db.exec("UPDATE accounts SET currency='gbp' WHERE id=42"), /CHECK constraint/);
  } finally {
    db.close();
  }
});
