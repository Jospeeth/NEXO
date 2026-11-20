export const sixthMigration = `
  ALTER TABLE movements ADD COLUMN transferGroup TEXT;
  ALTER TABLE movements ADD COLUMN excludedFromReports INTEGER NOT NULL DEFAULT 0 CHECK (excludedFromReports IN (0,1));
  ALTER TABLE movements ADD COLUMN excludedFromCashFlow INTEGER NOT NULL DEFAULT 0 CHECK (excludedFromCashFlow IN (0,1));
  CREATE INDEX movements_transfer_group ON movements(transferGroup) WHERE transferGroup IS NOT NULL;
  PRAGMA user_version = 6;
`;
