import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync, randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';
import { localDay } from '../../shared/date/local-day';
import { database } from '../../infrastructure/storage/database';
import { parseLedgerBackup, readLedgerBackup, type LedgerBackup } from './ledger-backup';

export const maxBackupBytes = 20 * 1024 * 1024;
const header = 'NEXO-BACKUP-1\n';

export async function createRecoveryCode() {
  const key = await AESEncryptionKey.generate();
  return key.encoded('hex');
}

export function normalizeRecoveryCode(code: string) {
  return code.replace(/[\s-]/g, '').toLowerCase();
}

export function isRecoveryCode(code: string) {
  return /^[0-9a-f]{64}$/.test(normalizeRecoveryCode(code));
}

export async function readBackupSnapshot() {
  return JSON.stringify(readLedgerBackup(await database()));
}

export async function withEncryptedBackup(snapshot: string, code: string, name: string, consume: (file: File) => Promise<void>) {
  // Unicode escapes keep JSON portable across devices.
  const json = snapshot.replace(/[^\x00-\x7f]/g, character =>
    '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0'));
  if (json.length + header.length + 28 > maxBackupBytes) throw new Error('Backup too large');
  const key = await AESEncryptionKey.import(normalizeRecoveryCode(code), 'hex');
  const sealed = await aesEncryptAsync(Uint8Array.from(json, character => character.charCodeAt(0)), key);
  const encrypted = await sealed.combined();
  const contents = new Uint8Array(header.length + encrypted.length);
  contents.set(Uint8Array.from(header, character => character.charCodeAt(0)));
  contents.set(encrypted, header.length);

  const file = new File(Paths.cache, name);
  try {
    file.create({ overwrite: true });
    await file.write(contents);
    await consume(file);
  } finally {
    if (file.exists) file.delete();
  }
}

export async function exportBackup(code: string) {
  const snapshot = await readBackupSnapshot();
  await withEncryptedBackup(snapshot, code, `NEXO-${localDay()}-${randomUUID().slice(0, 8)}.nexo-backup`, async file => {
    await Share.share({ url: file.uri });
  });
}

export async function openBackup(file: File, code: string): Promise<LedgerBackup> {
  if (file.size > maxBackupBytes) throw new Error('Backup too large');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > maxBackupBytes || bytes.length <= header.length + 28 ||
      !Array.from(header).every((character, index) => bytes[index] === character.charCodeAt(0))) {
    throw new Error('Invalid backup file');
  }
  const key = await AESEncryptionKey.import(normalizeRecoveryCode(code), 'hex');
  const plaintext = await aesDecryptAsync(AESSealedData.fromCombined(bytes.subarray(header.length)), key);
  const chunks: string[] = [];
  for (let offset = 0; offset < plaintext.length; offset += 8192) {
    chunks.push(String.fromCharCode(...plaintext.subarray(offset, offset + 8192)));
  }
  return parseLedgerBackup(JSON.parse(chunks.join('')));
}
