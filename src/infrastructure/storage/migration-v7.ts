export const seventhMigration = `
  ALTER TABLE accounts ADD COLUMN statementDay INTEGER
    CHECK (statementDay IS NULL OR (isCreditCard = 1 AND statementDay BETWEEN 1 AND 31));
  ALTER TABLE accounts ADD COLUMN paymentDay INTEGER
    CHECK (paymentDay IS NULL OR (isCreditCard = 1 AND paymentDay BETWEEN 1 AND 31));
  PRAGMA user_version = 7;
`;
