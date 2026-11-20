export const firstMigration = `
  CREATE TABLE account (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    currency TEXT NOT NULL CHECK (currency IN ('COP','USD','EUR')),
    openingMinor INTEGER NOT NULL CHECK (openingMinor BETWEEN -99999999999999 AND 99999999999999)
  ) STRICT;
  PRAGMA user_version = 1;
`;

export const insertAccount = 'INSERT INTO account(id,currency,openingMinor) VALUES(1,?,?) ON CONFLICT(id) DO NOTHING';
export const selectAccount = 'SELECT currency, openingMinor FROM account WHERE id = 1';

export const secondMigration = `
  CREATE TABLE accounts (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
    kind TEXT NOT NULL CHECK (kind IN ('checking','savings','cash','credit','investment')),
    currency TEXT NOT NULL CHECK (currency IN ('COP','USD','EUR')),
    openingMinor INTEGER NOT NULL CHECK (openingMinor BETWEEN -99999999999999 AND 99999999999999)
  ) STRICT;
  INSERT INTO accounts SELECT id, 'Cuenta principal', 'checking', currency, openingMinor FROM account;
  CREATE TABLE movements (
    id INTEGER PRIMARY KEY,
    accountId INTEGER NOT NULL REFERENCES accounts(id),
    kind TEXT NOT NULL CHECK (kind IN ('income','expense')),
    amountMinor INTEGER NOT NULL CHECK (amountMinor BETWEEN 1 AND 99999999999999),
    note TEXT NOT NULL CHECK (length(note) <= 120),
    recordedAt TEXT NOT NULL
  ) STRICT;
  CREATE INDEX movements_account ON movements(accountId, id DESC);
  DROP TABLE account;
  PRAGMA user_version = 2;
`;

export const selectAccountsWithBalances = `
    SELECT a.id, a.name, a.currency, a.openingMinor, a.color, a.budgetMinor,
           CASE WHEN a.isCreditCard = 1 THEN 'credit_card' ELSE a.kind END AS kind,
           COALESCE(SUM(CASE
             WHEN m.kind = 'expense' AND m.transferGroup IS NULL AND m.excludedFromReports = 0
               AND COALESCE(m.transactionDate, date(m.recordedAt, 'localtime')) >= ?
             THEN m.amountMinor ELSE 0
           END), 0) AS monthSpentMinor,
           a.openingMinor + COALESCE(SUM(
      CASE m.kind WHEN 'income' THEN m.amountMinor ELSE -m.amountMinor END
    ), 0) AS balanceMinor
    FROM accounts a LEFT JOIN movements m ON m.accountId = a.id
      AND COALESCE(m.transactionDate, date(m.recordedAt, 'localtime')) <= ?
    GROUP BY a.id ORDER BY a.id
  `;
