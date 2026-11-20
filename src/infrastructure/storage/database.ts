import { getRandomBytesAsync } from 'expo-crypto';
import { getInfoAsync } from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { firstMigration, secondMigration } from '../../features/accounts/schema';
import { thirdMigration } from './migration-v3';
import { sixthMigration } from './migration-v6';
import { fifthMigration } from './migration-v5';
import { fourthMigration } from './migration-v4';
import { seventhMigration } from './migration-v7';
import { unlock } from './unlock';

const name = 'nexo-demo.db';
const keyId = 'nexo.demo.database.v1';
let opening: Promise<SQLite.SQLiteDatabase> | undefined;

function openEncryptedLedger() {
  return unlock({
    async exists() {
      const path = SQLite.defaultDatabaseDirectory + '/' + name;
      return (await getInfoAsync(path.startsWith('file:') ? path : 'file://' + path)).exists;
    },
    readKey: () => SecureStore.getItemAsync(keyId),
    async provisionKey() {
      const bytes = await getRandomBytesAsync(32);
      const key = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      await SecureStore.setItemAsync(keyId, key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
      });
      return key;
    },
    open: () => SQLite.openDatabaseAsync(name, { useNewConnection: true })
  });
}

async function initialize() {
  const db = await openEncryptedLedger();
  try {
    const row = await db.getFirstAsync<{user_version: number}>('PRAGMA user_version');
    await db.execAsync('PRAGMA foreign_keys = ON');
    const version = row?.user_version;
    if (version === undefined || version < 0 || version > 7) {
      throw new Error('Unsupported schema');
    }
    if (version < 7) {
      await db.withTransactionAsync(async () => {
        if (version === 0) await db.execAsync(firstMigration);
        if (version <= 1) await db.execAsync(secondMigration);
        if (version <= 2) await db.execAsync(thirdMigration);
        if (version <= 3) await db.execAsync(fourthMigration);
        if (version <= 4) await db.execAsync(fifthMigration);
        if (version <= 5) await db.execAsync(sixthMigration);
        await db.execAsync(seventhMigration);
      });
    }
    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}

export function database() {
  opening ??= initialize().catch(error => {
    opening = undefined;
    throw error;
  });
  return opening;
}

