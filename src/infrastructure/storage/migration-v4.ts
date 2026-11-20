export const fourthMigration = `
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
    emoji TEXT NOT NULL DEFAULT '📦' CHECK (length(emoji) >= 1),
    kind TEXT NOT NULL CHECK (kind IN ('income','expense','both'))
  ) STRICT;

  INSERT INTO categories (name, emoji, kind) VALUES
    ('Food & Beverage', '🍔', 'expense'),
    ('Groceries', '🛒', 'expense'),
    ('Transportation', '🚗', 'expense'),
    ('Housing', '🏠', 'expense'),
    ('Entertainment', '🎮', 'expense'),
    ('Shopping', '🛍️', 'expense'),
    ('Health', '💊', 'expense'),
    ('Salary', '💰', 'income'),
    ('Freelance', '💻', 'income'),
    ('Investment', '📈', 'income');

  ALTER TABLE movements ADD COLUMN categoryId INTEGER REFERENCES categories(id);

  PRAGMA user_version = 4;
`;
