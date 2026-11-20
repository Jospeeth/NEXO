import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { parseParkerCsv } from '../src/features/import/parker-csv.ts';
import { writeLedger } from '../src/features/import/write-ledger.ts';
import { summarize } from '../src/features/dashboard/summary.ts';
import { firstMigration, secondMigration, selectAccountsWithBalances } from '../src/features/accounts/schema.ts';
import { thirdMigration } from '../src/infrastructure/storage/migration-v3.ts';
import { fourthMigration } from '../src/infrastructure/storage/migration-v4.ts';
import { fifthMigration } from '../src/infrastructure/storage/migration-v5.ts';
import { sixthMigration } from '../src/infrastructure/storage/migration-v6.ts';

const header = 'Date,Type,Amount,Currency,Account,Category,Note,Transfer direction,Excluded from reports,Excluded from cash flow,ID,Account ID,Category ID,Transfer group,Split parent,Parent ID';
const income = '2026-11-20T01:00:00.000Z,income,100.05,COP,Account A,Salary,"Hello, ""world""",,false,false,m1,a1,c1,,false,';
const outgoing = '2026-11-20T01:00:00.000Z,transfer,20,COP,Account A,,,outgoing,false,true,m2,a1,,t1,false,';
const incoming = '2026-11-20T01:00:00.000Z,transfer,20,COP,Account B,,,incoming,false,true,m3,a2,,t1,false,';
const parse = (...rows) => parseParkerCsv('\uFEFF' + [header, ...rows].join('\r\n'), 'America/Bogota');

test('importa posiciones de transferencia vinculadas y conserva el día local', () => {
  const plan = parse(income, outgoing, incoming);
  assert.equal(plan.accounts.length, 2);
  assert.equal(plan.transfers, 1);
  assert.equal(plan.movements[0].amountMinor, 10005);
  assert.equal(plan.movements[0].date, '2026-11-19');
  assert.equal(plan.movements[0].note, 'Hello, "world"');
  assert.throws(() => parse(income, outgoing), { code: 'transfer' });
  assert.throws(() => parse(income, income), { code: 'row' });
  assert.throws(() => parse(), { code: 'empty' });
  assert.throws(() => parse(income.replace('100.05', '100.005')), { code: 'row' });
});

test('reemplaza el historial de forma atómica y las transferencias no alteran el flujo', () => {
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    withTransactionSync(task) {
      sqlite.exec('BEGIN');
      try { task(); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    execSync: sql => sqlite.exec(sql),
    isInTransactionSync: () => sqlite.isTransaction,
    prepareSync(sql) {
      const statement = sqlite.prepare(sql);
      return { executeSync: (...args) => ({ lastInsertRowId: Number(statement.run(...args).lastInsertRowid) }), finalizeSync() {} };
    },
  };
  try {
    sqlite.exec('PRAGMA foreign_keys = ON');
    sqlite.exec(firstMigration + secondMigration + thirdMigration + fourthMigration + fifthMigration + sixthMigration);
    sqlite.exec("INSERT INTO accounts(name,kind,currency,openingMinor) VALUES('Old account','checking','COP',500)");
    const plan = parse(income, outgoing, incoming);
    const broken = { ...plan, movements: [...plan.movements, { ...plan.movements[0], accountKey: 'missing' }] };
    sqlite.exec('BEGIN');
    assert.throws(() => writeLedger(db, plan));
    assert.equal(sqlite.isTransaction, true);
    sqlite.exec('ROLLBACK');
    assert.throws(() => writeLedger(db, broken));
    assert.equal(sqlite.prepare('SELECT name FROM accounts').get().name, 'Old account');
    writeLedger(db, plan);
    const accounts = sqlite.prepare(selectAccountsWithBalances).all('2026-11-01', '2026-11-20');
    assert.deepEqual(accounts.map(account => account.balanceMinor), [8005, 2000]);
    const rows = sqlite.prepare('SELECT *, transactionDate FROM movements').all();
    const summary = summarize(accounts, rows, '2026-11', 'COP', '2026-11-20');
    assert.equal(summary.netCashFlow, 10005);
    assert.equal(summary.income, 10005);
    assert.equal(summary.expense, 0);
    assert.equal(summary.closingBalance, 10005);
    assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    sqlite.close();
  }
});

test('una nueva transferencia registra ambos lados y no cambia el total ni el flujo', async () => {
  const { writeTransfer } = await import('../src/features/transfers/write-transfer.ts');
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    withTransactionSync(task) {
      sqlite.exec('BEGIN');
      try { task(); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    getAllSync: (sql, ...params) => sqlite.prepare(sql).all(...params),
    runSync: (sql, ...params) => sqlite.prepare(sql).run(...params),
  };
  try {
    sqlite.exec(firstMigration + secondMigration + thirdMigration + fourthMigration + fifthMigration + sixthMigration);
    sqlite.exec(`INSERT INTO accounts(id, name, kind, currency, openingMinor)
      VALUES (1, 'A', 'checking', 'COP', 5000), (2, 'B', 'savings', 'COP', 2000), (3, 'C', 'cash', 'USD', 0)`);
    const input = { fromId: 1, toId: 2, amountMinor: 1000, date: '2026-11-20', note: '' };
    const recordedAt = '2026-11-20T12:00:00.000Z';
    assert.throws(() => writeTransfer(db, { ...input, toId: 3 }, 'bad', recordedAt));
    assert.throws(() => writeTransfer(db, { ...input, toId: 1 }, 'same', recordedAt));
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM movements').get().count, 0);
    writeTransfer(db, input, 'valid', recordedAt);
    const rows = sqlite.prepare('SELECT * FROM movements').all();
    assert.equal(rows.length, 2);
    assert.ok(rows.every(row => row.transferGroup === 'valid' && row.excludedFromCashFlow === 1));
    const accounts = sqlite.prepare(selectAccountsWithBalances).all('2026-11-01', '2026-11-20');
    assert.deepEqual(accounts.map(account => account.balanceMinor), [4000, 3000, 0]);
    const summary = summarize(accounts, rows, '2026-11', 'COP', '2026-11-20');
    assert.equal(summary.netCashFlow, 0);
    assert.equal(summary.closingBalance, 7000);
  } finally {
    sqlite.close();
  }
});
