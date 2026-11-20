import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { firstMigration, secondMigration } from '../src/features/accounts/schema.ts';
import { thirdMigration } from '../src/infrastructure/storage/migration-v3.ts';
import { fourthMigration } from '../src/infrastructure/storage/migration-v4.ts';
import { fifthMigration } from '../src/infrastructure/storage/migration-v5.ts';
import { sixthMigration } from '../src/infrastructure/storage/migration-v6.ts';
import { seventhMigration } from '../src/infrastructure/storage/migration-v7.ts';
import { parseLedgerBackup, readLedgerBackup, restoreLedgerBackup } from '../src/features/backup/ledger-backup.ts';

function ledger() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for (const migration of [firstMigration, secondMigration, thirdMigration, fourthMigration, fifthMigration, sixthMigration, seventhMigration]) {
    sqlite.exec(migration);
  }
  return {
    execSync: sql => sqlite.exec(sql),
    getAllSync: sql => sqlite.prepare(sql).all(),
    prepareSync(sql) {
      const statement = sqlite.prepare(sql);
      return { executeSync: values => statement.run(...values), finalizeSync() {} };
    },
    close: () => sqlite.close(),
  };
}

test('restaura cuentas, presupuestos y transferencias conservando sus referencias', () => {
  const source = ledger();
  const target = ledger();
  try {
    source.execSync(`
      INSERT INTO accounts(id, name, kind, currency, openingMinor, color, isCreditCard, budgetMinor, statementDay, paymentDay)
        VALUES (41,'Tarjeta','credit','COP',0,'#713BCC',1,50000,10,25), (42,'Banco','checking','COP',90000,NULL,0,NULL,NULL,NULL);
      UPDATE categories SET name='Café ☕', budgetMinor=99000,budgetCurrency='COP' WHERE id=1;
      INSERT INTO movements(id, accountId, kind, amountMinor, note, recordedAt, transactionDate, categoryId,
        transferGroup, excludedFromCashFlow) VALUES
        (90,41,'expense',100,'Café ☕','2026-11-19','2026-11-18',1,NULL,0),
        (91,42,'expense',1000,'Pago','2026-11-19','2026-11-18',NULL,'T1',1),
        (92,41,'income',1000,'Pago','2026-11-19','2026-11-18',NULL,'T1',1);
    `);
    const backup = parseLedgerBackup(JSON.parse(JSON.stringify(readLedgerBackup(source))));
    restoreLedgerBackup(target, backup);
    assert.deepEqual(readLedgerBackup(target), backup);
    assert.deepEqual(backup.rows.accounts[0].slice(-2), [10, 25]);
    const old = structuredClone(backup);
    old.rows.accounts = old.rows.accounts.map(row => row.slice(0, -2));
    assert.deepEqual(parseLedgerBackup(old).rows.accounts[0].slice(-2), [null, null]);

    const invalid = structuredClone(backup);
    invalid.rows.movements[0][1] = 999;
    assert.throws(() => restoreLedgerBackup(target, invalid), /FOREIGN KEY/);
    assert.deepEqual(readLedgerBackup(target), backup);
  } finally {
    source.close();
    target.close();
  }
});

test('rechaza el formato desconocido y filas incompletas antes de escribir', () => {
  const backup = { format: 'nexo-ledger', version: 1, rows: { accounts: [], categories: [], movements: [] } };
  assert.deepEqual(parseLedgerBackup(backup), backup);
  assert.throws(() => parseLedgerBackup({ ...backup, version: 2 }));
  assert.throws(() => parseLedgerBackup({ ...backup, rows: { ...backup.rows, movements: [[1, 2]] } }));
});
