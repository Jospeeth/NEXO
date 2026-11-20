export const thirdMigration = `
  ALTER TABLE accounts ADD COLUMN openingDate TEXT;
  ALTER TABLE accounts ADD COLUMN color TEXT;
  ALTER TABLE accounts ADD COLUMN icon TEXT;
  ALTER TABLE accounts ADD COLUMN note TEXT;
  ALTER TABLE accounts ADD COLUMN isArchived INTEGER NOT NULL DEFAULT 0 CHECK (isArchived IN (0, 1));
  ALTER TABLE movements ADD COLUMN transactionDate TEXT;
  UPDATE movements SET transactionDate = date(recordedAt, 'localtime');
  CREATE INDEX movements_account_date ON movements(accountId, transactionDate);
  PRAGMA user_version = 3;
`;
