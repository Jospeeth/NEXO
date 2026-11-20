export const fifthMigration = `
  ALTER TABLE accounts ADD COLUMN isCreditCard INTEGER NOT NULL DEFAULT 0
    CHECK (isCreditCard IN (0, 1) AND (isCreditCard = 0 OR kind = 'credit'));
  ALTER TABLE accounts ADD COLUMN budgetMinor INTEGER
    CHECK (budgetMinor IS NULL OR (isCreditCard = 1 AND budgetMinor BETWEEN 1 AND 99999999999999));
  ALTER TABLE categories ADD COLUMN budgetMinor INTEGER
    CHECK (budgetMinor IS NULL OR budgetMinor BETWEEN 1 AND 99999999999999);
  ALTER TABLE categories ADD COLUMN budgetCurrency TEXT
    CHECK (
      (budgetMinor IS NULL AND budgetCurrency IS NULL) OR
      (budgetMinor IS NOT NULL AND budgetCurrency IS NOT NULL AND budgetCurrency IN ('COP','USD','EUR'))
    );
  PRAGMA user_version = 5;
`;
