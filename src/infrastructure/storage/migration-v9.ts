export const ninthMigration = `
  ALTER TABLE accounts ADD COLUMN cardProfile TEXT;
  ALTER TABLE movements ADD COLUMN feeOccurrence TEXT
    CHECK (feeOccurrence IS NULL OR (kind = 'expense' AND transferGroup IS NULL));
  CREATE UNIQUE INDEX movements_account_fee_occurrence
    ON movements(accountId, feeOccurrence) WHERE feeOccurrence IS NOT NULL;
  PRAGMA user_version = 9;
`;
