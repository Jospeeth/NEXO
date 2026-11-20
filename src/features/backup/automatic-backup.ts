import { requireOptionalNativeModule } from 'expo';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import { Directory } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { createRecoveryCode, isRecoveryCode, readBackupSnapshot, withEncryptedBackup } from './backup-file';

interface BackupFolderModule {
  rememberFolder(uri: string): Promise<void>;
  writeBackup(sourceUri: string, name: string): Promise<void>;
}
const folderAccess = Platform.OS === 'ios' ? requireOptionalNativeModule<BackupFolderModule>('NexoBackupFolder') : null;
export const automaticBackupAvailable = folderAccess !== null;

type Configuration = { code: string; id: string; enabled: boolean };
type Status = { ready: boolean; enabled: boolean; saving: boolean; error: boolean; savedAt: number | null };
const key = 'nexo.backup.automatic.v1';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
let config: Configuration | null = null;
let status: Status = { ready: false, enabled: false, saving: false, error: false, savedAt: null };
let lastDigest: string | undefined;
let writing: Promise<void> | undefined;
let load: Promise<void> | undefined;
const listeners = new Set<() => void>();

function setStatus(changes: Partial<Status>) {
  status = { ...status, ...changes };
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useAutomaticBackupStatus() {
  return useSyncExternalStore(subscribe, () => status);
}

function initialize() {
  load ??= (async () => {
    const stored = await SecureStore.getItemAsync(key, options);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<Configuration> | null;
      if (!parsed || typeof parsed.code !== 'string' || !isRecoveryCode(parsed.code) ||
          typeof parsed.id !== 'string' || !/^[0-9a-f]{12}$/.test(parsed.id) || typeof parsed.enabled !== 'boolean') {
        throw new Error('Invalid backup settings');
      }
      config = { code: parsed.code, id: parsed.id, enabled: parsed.enabled };
    }
    setStatus({ ready: true, enabled: config?.enabled ?? false, error: false });
  })().catch(error => {
    load = undefined;
    setStatus({ error: true });
    throw error;
  });
  return load;
}

async function store(next: Configuration) {
  await SecureStore.setItemAsync(key, JSON.stringify(next), options);
  config = next;
  setStatus({ enabled: next.enabled, error: false });
}

export async function prepareAutomaticBackup() {
  await initialize();
  return config?.code ?? createRecoveryCode();
}

export async function chooseAutomaticBackupFolder(code: string) {
  if (!folderAccess || !isRecoveryCode(code)) return false;
  await initialize();
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_FILE_PICKING_CANCELLED') {
      return false;
    }
    throw error;
  }
  await writing;
  await folderAccess.rememberFolder(folder.uri);
  lastDigest = undefined;
  await store({ id: config?.id ?? randomUUID().replace(/-/g, '').slice(0, 12), code, enabled: true });
  await saveAutomaticBackup();
  return true;
}

export async function stopAutomaticBackup() {
  await initialize();
  if (config) await store({ ...config, enabled: false });
  await writing;
}

export async function saveAutomaticBackup() {
  if (!folderAccess) return;
  const access = folderAccess;
  try {
    await initialize();
  } catch {
    return;
  }
  if (writing) return writing;
  if (!config?.enabled) return;
  const current = config;
  writing = (async () => {
    try {
      const snapshot = await readBackupSnapshot();
      const digest = await digestStringAsync(CryptoDigestAlgorithm.SHA256, snapshot);
      if (digest === lastDigest || config !== current) return;
      setStatus({ saving: true, error: false });
      const name = `NEXO-Auto-${current.id}.nexo-backup`;
      await withEncryptedBackup(snapshot, current.code, name, file => access.writeBackup(file.uri, name));
      lastDigest = digest;
      setStatus({ savedAt: Date.now() });
    } catch {
      setStatus({ error: true });
    } finally {
      setStatus({ saving: false });
    }
  })().finally(() => { writing = undefined; });
  return writing;
}

export function startAutomaticBackups() {
  if (!folderAccess) return;
  const saveInForeground = () => {
    if (AppState.currentState === 'active') void saveAutomaticBackup();
  };
  const appState = AppState.addEventListener('change', saveInForeground);
  const timer = setInterval(saveInForeground, 15_000);
  saveInForeground();
  return () => {
    appState.remove();
    clearInterval(timer);
  };
}
