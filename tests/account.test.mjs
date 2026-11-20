import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseOpening } from '../src/features/accounts/account.ts';
import { firstMigration, insertAccount, selectAccount } from '../src/features/accounts/schema.ts';
import { MissingKey, unlock } from '../src/infrastructure/storage/unlock.ts';

test('precisión del saldo de apertura y límites', () => {
  for (const [text, value] of [['0',0],['-0,01',-1],['1.2',120],['1.234',null],['1e5',null],['999999999999.99',99999999999999],['1000000000000',null]]) {
    assert.equal(parseOpening(text), value);
  }
});

test('alta única, reintentos y reapertura del esquema en SQLite', t => {
  const dir = mkdtempSync(join(tmpdir(), 'nexo-test-'));
  t.after(() => rmSync(dir, {recursive:true, force:true}));
  const file = join(dir,'demo.db');
  let db = new DatabaseSync(file);
  db.exec(firstMigration);
  db.prepare(insertAccount).run('COP', 123);
  db.prepare(insertAccount).run('USD', 321);
  db.close();
  db = new DatabaseSync(file);
  assert.deepEqual({...db.prepare(selectAccount).get()}, {currency:'COP', openingMinor:123});
  db.close();
});

function fixture({existing = true, key = 'a'.repeat(64), cipher = '4', readable = true} = {}) {
  const calls = [];
  const connection = {
    async execAsync() { calls.push('apply-key'); },
    async getFirstAsync(query) {
      calls.push(query);
      if (query === 'PRAGMA cipher_version') return {cipher_version:cipher};
      if (!readable) throw Error('unreadable');
    },
    async closeAsync() { calls.push('close'); }
  };
  return {calls, storage:{
    async exists() {return existing;},
    async readKey() {return key;},
    async provisionKey() {calls.push('provision'); return 'b'.repeat(64);},
    async open() {calls.push('open'); return connection;}
  }};
}

test('archivo existente sin clave se conserva', async () => {
  const {storage, calls} = fixture({key:null});
  await assert.rejects(unlock(storage), MissingKey);
  assert.deepEqual(calls, []);
});
test('sin SQLCipher se cierra antes de escribir', async () => {
  const {storage, calls} = fixture({cipher:''});
  await assert.rejects(unlock(storage));
  assert.deepEqual(calls,['open','PRAGMA cipher_version','close']);
});
test('si falla la autenticación del esquema la conexión se cierra', async () => {
  const {storage, calls} = fixture({readable:false});
  await assert.rejects(unlock(storage));
  assert.equal(calls.at(-1),'close');
});
test('primer inicio guarda la clave antes de abrir', async () => {
  const {storage, calls} = fixture({key:null, existing:false});
  await unlock(storage);
  assert.deepEqual(calls,['provision','open','PRAGMA cipher_version','apply-key','SELECT count(*) FROM sqlite_master']);
});

test('la migración conserva la cuenta y separa movimientos por cuenta', async () => {
  const { secondMigration } = await import('../src/features/accounts/schema.ts');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(firstMigration);
    db.prepare(insertAccount).run('COP', -500);
    db.exec(secondMigration);
    assert.deepEqual({ ...db.prepare('SELECT * FROM accounts WHERE id = 1').get() },
      { id: 1, name: 'Cuenta principal', kind: 'checking', currency: 'COP', openingMinor: -500 });
    db.exec("INSERT INTO accounts VALUES (2, 'Ahorros', 'savings', 'USD', 0)");
    const insert = db.prepare('INSERT INTO movements(accountId, kind, amountMinor, note, recordedAt) VALUES (?, ?, ?, ?, ?)');
    insert.run(1, 'income', 1000, '', '2026-11-19');
    insert.run(1, 'expense', 300, '', '2026-11-19');
    insert.run(2, 'income', 200, '', '2026-11-19');
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM movements WHERE accountId = 1').get().count, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM movements WHERE accountId = 2').get().count, 1);
    assert.throws(() => insert.run(99, 'expense', 100, '', '2026-11-19'));
  } finally {
    db.close();
  }
});

test('v3 conserva cuentas, movimientos y relaciones de v2', async () => {
  const { secondMigration } = await import('../src/features/accounts/schema.ts');
  const { thirdMigration } = await import('../src/infrastructure/storage/migration-v3.ts');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(firstMigration);
    db.exec(secondMigration);
    db.exec(`
      INSERT INTO accounts VALUES (1, 'Principal', 'checking', 'COP', 3350);
      INSERT INTO accounts VALUES (2, 'Inversión', 'investment', 'USD', 1200);
      INSERT INTO movements VALUES (11, 1, 'expense', 150, 'Compra', '2026-11-19T19:00:00.000Z');
      INSERT INTO movements VALUES (12, 2, 'income', 200, '', '2026-11-19T19:00:01.000Z');
    `);
    const accounts = 'SELECT id, name, kind, currency, openingMinor FROM accounts ORDER BY id';
    const movements = 'SELECT id, accountId, kind, amountMinor, note, recordedAt FROM movements ORDER BY id';
    const before = [db.prepare(accounts).all(), db.prepare(movements).all()];
    db.exec('BEGIN; ' + thirdMigration + ' COMMIT;');
    assert.deepEqual([db.prepare(accounts).all(), db.prepare(movements).all()], before);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 3);
    assert.equal(db.prepare('SELECT openingDate FROM accounts WHERE id = 1').get().openingDate, null);
    assert.equal(db.prepare("SELECT count(*) AS matches FROM movements WHERE transactionDate = date(recordedAt, 'localtime')").get().matches, 2);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    db.close();
  }
});

test('v4 crea categorías por defecto, agrega categoryId a movements y conserva datos de v3', async () => {
  const { secondMigration } = await import('../src/features/accounts/schema.ts');
  const { thirdMigration } = await import('../src/infrastructure/storage/migration-v3.ts');
  const { fourthMigration } = await import('../src/infrastructure/storage/migration-v4.ts');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(firstMigration);
    db.exec(secondMigration);
    db.exec('BEGIN; ' + thirdMigration + ' COMMIT;');
    db.exec(`
      INSERT INTO accounts(id, name, kind, currency, openingMinor) VALUES (1, 'Nómina', 'checking', 'COP', 500000);
      INSERT INTO movements(id, accountId, kind, amountMinor, note, recordedAt, transactionDate)
      VALUES (1, 1, 'income', 100000, 'Salario quincena', '2026-11-19T10:00:00.000Z', '2026-11-19');
    `);

    db.exec('BEGIN; ' + fourthMigration + ' COMMIT;');

    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 4);

    const categoriesCount = db.prepare('SELECT count(*) AS total FROM categories').get().total;
    assert.equal(categoriesCount, 10);

    const foodCategory = { ...db.prepare("SELECT emoji, kind FROM categories WHERE name = 'Food & Beverage'").get() };
    assert.deepEqual(foodCategory, { emoji: '🍔', kind: 'expense' });

    // Movement before v4 has null categoryId
    const existingMovement = db.prepare('SELECT categoryId FROM movements WHERE id = 1').get();
    assert.equal(existingMovement.categoryId, null);

    // Can insert movement with valid categoryId
    const salaryCat = db.prepare("SELECT id FROM categories WHERE name = 'Salary'").get();
    db.prepare('INSERT INTO movements(id, accountId, kind, amountMinor, note, recordedAt, transactionDate, categoryId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(2, 1, 'income', 200000, 'Bono', '2026-11-19T12:00:00.000Z', '2026-11-19', salaryCat.id);

    const newMovement = db.prepare('SELECT categoryId FROM movements WHERE id = 2').get();
    assert.equal(newMovement.categoryId, salaryCat.id);

    // Foreign key enforcement
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    db.close();
  }
});

test('edición y eliminación de cuentas y categorías', async () => {
  const { secondMigration } = await import('../src/features/accounts/schema.ts');
  const { thirdMigration } = await import('../src/infrastructure/storage/migration-v3.ts');
  const { fourthMigration } = await import('../src/infrastructure/storage/migration-v4.ts');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(firstMigration);
    db.exec(secondMigration);
    db.exec('BEGIN; ' + thirdMigration + ' COMMIT;');
    db.exec('BEGIN; ' + fourthMigration + ' COMMIT;');

    // Insert account
    db.prepare('INSERT INTO accounts(id, name, kind, currency, openingMinor) VALUES (?, ?, ?, ?, ?)')
      .run(1, 'Ahorros', 'savings', 'COP', 10000);

    // Update account
    db.prepare('UPDATE accounts SET name = ?, kind = ?, currency = ? WHERE id = ?')
      .run('Ahorros VIP', 'investment', 'USD', 1);

    const updated = { ...db.prepare('SELECT name, kind, currency FROM accounts WHERE id = 1').get() };
    assert.deepEqual(updated, { name: 'Ahorros VIP', kind: 'investment', currency: 'USD' });

    // Update category
    const foodCat = db.prepare("SELECT id FROM categories WHERE name = 'Food & Beverage'").get();
    db.prepare('UPDATE categories SET emoji = ?, name = ? WHERE id = ?')
      .run('🍕', 'Pizza & Fast Food', foodCat.id);

    const updatedCat = { ...db.prepare('SELECT emoji, name FROM categories WHERE id = ?').get(foodCat.id) };
    assert.deepEqual(updatedCat, { emoji: '🍕', name: 'Pizza & Fast Food' });

    // Delete account cascades or deletes movements
    db.prepare("INSERT INTO movements(id, accountId, kind, amountMinor, note, recordedAt) VALUES (1, 1, 'expense', 500, '', '2026-11-19')").run();
    db.prepare('DELETE FROM movements WHERE accountId = 1').run();
    db.prepare('DELETE FROM accounts WHERE id = 1').run();

    assert.equal(db.prepare('SELECT count(*) AS total FROM accounts WHERE id = 1').get().total, 0);
    assert.equal(db.prepare('SELECT count(*) AS total FROM movements WHERE accountId = 1').get().total, 0);
  } finally {
    db.close();
  }
});

test('v5 conserva préstamos existentes y valida presupuestos de tarjetas y categorías', async () => {
  const { secondMigration } = await import('../src/features/accounts/schema.ts');
  const { thirdMigration } = await import('../src/infrastructure/storage/migration-v3.ts');
  const { fourthMigration } = await import('../src/infrastructure/storage/migration-v4.ts');
  const { fifthMigration } = await import('../src/infrastructure/storage/migration-v5.ts');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(firstMigration + secondMigration + thirdMigration + fourthMigration);
    db.exec("INSERT INTO accounts(id,name,kind,currency,openingMinor) VALUES(1,'Loan','credit','COP',-500)");
    db.exec("INSERT INTO movements(accountId,kind,amountMinor,note,recordedAt) VALUES(1,'expense',25,'','2026-11-19')");
    db.exec('BEGIN; ' + fifthMigration + ' COMMIT;');
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 5);
    assert.deepEqual({ ...db.prepare('SELECT kind,isCreditCard,budgetMinor FROM accounts WHERE id = 1').get() },
      { kind: 'credit', isCreditCard: 0, budgetMinor: null });
    assert.equal(db.prepare('SELECT amountMinor FROM movements WHERE accountId = 1').get().amountMinor, 25);
    assert.throws(() => db.exec('UPDATE accounts SET budgetMinor = 100 WHERE id = 1'));
    db.exec("INSERT INTO accounts(name,kind,currency,openingMinor,isCreditCard,budgetMinor) VALUES('Card','credit','USD',0,1,1000)");
    assert.throws(() => db.exec('UPDATE categories SET budgetMinor = 100 WHERE id = 1'));
    db.exec("UPDATE categories SET budgetMinor = 3000, budgetCurrency = 'COP' WHERE id = 1");
    assert.throws(() => db.exec("UPDATE categories SET budgetCurrency = 'XXX' WHERE id = 1"));
    db.exec('UPDATE categories SET budgetMinor = NULL, budgetCurrency = NULL WHERE id = 1');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    db.close();
  }
});

test('la consulta de cuentas resuelve una base recién creada sin movimientos ni cuentas', async () => {
  const { secondMigration, selectAccountsWithBalances } = await import('../src/features/accounts/schema.ts');
  const { thirdMigration } = await import('../src/infrastructure/storage/migration-v3.ts');
  const { fourthMigration } = await import('../src/infrastructure/storage/migration-v4.ts');
  const { fifthMigration } = await import('../src/infrastructure/storage/migration-v5.ts');
  const { sixthMigration } = await import('../src/infrastructure/storage/migration-v6.ts');
  const { seventhMigration } = await import('../src/infrastructure/storage/migration-v7.ts');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(firstMigration + secondMigration + thirdMigration + fourthMigration + fifthMigration + sixthMigration + seventhMigration);
    const query = db.prepare(selectAccountsWithBalances);
    assert.deepEqual(query.all('2026-11-01', '2026-11-20'), []);
    db.exec("INSERT INTO accounts(name,kind,currency,openingMinor) VALUES('Cash','cash','COP',0)");
    assert.equal(query.get('2026-11-01', '2026-11-20').balanceMinor, 0);
    db.exec('DELETE FROM accounts');
    assert.deepEqual(query.all('2026-11-01', '2026-11-20'), []);
  } finally {
    db.close();
  }
});
