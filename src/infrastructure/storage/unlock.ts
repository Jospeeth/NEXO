interface Connection {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
  closeAsync(): Promise<void>;
}

interface Storage<D extends Connection> {
  exists(): Promise<boolean>;
  readKey(): Promise<string | null>;
  provisionKey(): Promise<string>;
  open(): Promise<D>;
}

export class MissingKey extends Error {}
export class SQLCipherUnavailable extends Error {}

export async function unlock<D extends Connection>(storage: Storage<D>): Promise<D> {
  const existing = await storage.exists();
  let key = await storage.readKey();
  if (key === null) {
    if (existing) throw new MissingKey();
    key = await storage.provisionKey();
  }
  if (!/^[0-9a-f]{64}$/.test(key)) throw new Error('Invalid key');
  const db = await storage.open();
  try {
    const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    if (!cipher?.cipher_version) throw new SQLCipherUnavailable('SQLCipher unavailable');
    await db.execAsync(`PRAGMA key = "x'${key}'"`);
    // Reading the schema forces authentication before migrations can write.
    await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}
