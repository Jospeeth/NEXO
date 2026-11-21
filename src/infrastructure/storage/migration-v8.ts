export const eighthMigration = `
  ALTER TABLE movements RENAME TO movements_v7;
  ALTER TABLE accounts RENAME TO accounts_v7;
  ALTER TABLE categories RENAME TO categories_v7;

  CREATE TABLE accounts (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
      kind TEXT NOT NULL CHECK (kind IN ('checking','savings','cash','credit','investment')),
      currency TEXT NOT NULL CHECK (currency GLOB '[A-Z][A-Z][A-Z]'),
      openingMinor INTEGER NOT NULL CHECK (openingMinor BETWEEN -99999999999999 AND 99999999999999)
    , openingDate TEXT, color TEXT, icon TEXT, note TEXT, isArchived INTEGER NOT NULL DEFAULT 0 CHECK (isArchived IN (0, 1)), isCreditCard INTEGER NOT NULL DEFAULT 0
      CHECK (isCreditCard IN (0, 1) AND (isCreditCard = 0 OR kind = 'credit')), budgetMinor INTEGER
      CHECK (budgetMinor IS NULL OR (isCreditCard = 1 AND budgetMinor BETWEEN 1 AND 99999999999999)), statementDay INTEGER
      CHECK (statementDay IS NULL OR (isCreditCard = 1 AND statementDay BETWEEN 1 AND 31)), paymentDay INTEGER
      CHECK (paymentDay IS NULL OR (isCreditCard = 1 AND paymentDay BETWEEN 1 AND 31))) STRICT;
  CREATE TABLE movements (
      id INTEGER PRIMARY KEY,
      accountId INTEGER NOT NULL REFERENCES accounts(id),
      kind TEXT NOT NULL CHECK (kind IN ('income','expense')),
      amountMinor INTEGER NOT NULL CHECK (amountMinor BETWEEN 1 AND 99999999999999),
      note TEXT NOT NULL CHECK (length(note) <= 120),
      recordedAt TEXT NOT NULL
    , transactionDate TEXT, categoryId INTEGER REFERENCES categories(id), transferGroup TEXT, excludedFromReports INTEGER NOT NULL DEFAULT 0 CHECK (excludedFromReports IN (0,1)), excludedFromCashFlow INTEGER NOT NULL DEFAULT 0 CHECK (excludedFromCashFlow IN (0,1))) STRICT;
  CREATE TABLE categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
      emoji TEXT NOT NULL DEFAULT '📦' CHECK (length(emoji) >= 1),
      kind TEXT NOT NULL CHECK (kind IN ('income','expense','both'))
    , budgetMinor INTEGER
      CHECK (budgetMinor IS NULL OR budgetMinor BETWEEN 1 AND 99999999999999), budgetCurrency TEXT
      CHECK (
        (budgetMinor IS NULL AND budgetCurrency IS NULL) OR
        (budgetMinor IS NOT NULL AND budgetCurrency IS NOT NULL AND budgetCurrency GLOB '[A-Z][A-Z][A-Z]')
      )) STRICT;

  INSERT INTO accounts SELECT * FROM accounts_v7;
  INSERT INTO categories SELECT * FROM categories_v7;
  INSERT INTO movements SELECT * FROM movements_v7;
  DROP TABLE movements_v7;
  DROP TABLE accounts_v7;
  DROP TABLE categories_v7;

  CREATE INDEX movements_account ON movements(accountId, id DESC);
  CREATE INDEX movements_account_date ON movements(accountId, transactionDate);
  CREATE INDEX movements_transfer_group ON movements(transferGroup) WHERE transferGroup IS NOT NULL;
  PRAGMA user_version = 8;
`;
