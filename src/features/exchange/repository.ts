import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { localDay } from '../../shared/date/local-day';
import { defaultCurrencies, isCurrencyCode, parseCatalog, parseRates, type CurrencyEntry, type ExchangeQuote } from './rate';

const endpoint = 'https://api.frankfurter.dev/v2';
const primaryKey = 'nexo.exchange.currency';
const preferencesKey = 'nexo.exchange.preferences.v2';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const cacheAge = 6 * 60 * 60 * 1000;
const pending = new Map<string, Promise<unknown>>();
const retryAfter = new Map<string, number>();

function cacheFile(name: string) {
  return new File(Paths.document, `nexo-frankfurter-${name}.json`);
}

async function cached<T>(name: string): Promise<T | null> {
  try {
    const file = cacheFile(name);
    return file.exists ? JSON.parse(await file.text()) as T : null;
  } catch {
    return null;
  }
}

async function request(path: string) {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(endpoint + path, { signal: controller.signal });
    if (!response.ok) throw new Error('Frankfurter unavailable');
    return await response.json() as unknown;
  } finally {
    clearTimeout(deadline);
  }
}

async function cachedRequest<T>(name: string, update: () => Promise<T>, force = false, historical = false) {
  const stored = await cached<{ value: T; savedAt: number }>(name);
  if (!force && stored && (historical || Date.now() - stored.savedAt < cacheAge)) {
    return { value: stored.value, offline: false };
  }
  if (!force && (retryAfter.get(name) ?? 0) > Date.now()) return { value: stored?.value ?? null, offline: true };

  let active = pending.get(name);
  if (!active) {
    active = update().then(async value => {
      try {
        const file = cacheFile(name);
        file.create({ overwrite: true });
        await file.write(JSON.stringify({ value, savedAt: Date.now() }));
      } catch {
        // Keep the successful result available for this session.
      }
      retryAfter.delete(name);
      return value;
    }).catch(error => {
      retryAfter.set(name, Date.now() + 60_000);
      throw error;
    }).finally(() => pending.delete(name));
    pending.set(name, active);
  }
  try {
    return { value: await active as T, offline: false };
  } catch {
    return { value: stored?.value ?? null, offline: true };
  }
}

export function readRates(date?: string, force = false) {
  return cachedRequest<ExchangeQuote>(date ?? 'latest', async () => {
    const payload = await request('/rates?base=USD' + (date ? '&date=' + encodeURIComponent(date) : ''));
    return parseRates(payload, Date.now(), date ?? localDay());
  }, force, !!date);
}

export async function readCatalog() {
  const result = await cachedRequest<CurrencyEntry[]>('catalog', async () => parseCatalog(await request('/currencies')));
  return { ...result, value: result.value ?? defaultCurrencies };
}

export async function readCurrencyPreferences() {
  const [legacy, raw] = await Promise.all([SecureStore.getItemAsync(primaryKey), SecureStore.getItemAsync(preferencesKey)]);
  let stored: { currency?: unknown; preferred?: unknown } | undefined;
  try { if (raw) stored = JSON.parse(raw); } catch { /* Fall back to the existing preference. */ }
  const currency = isCurrencyCode(stored?.currency) ? stored.currency : isCurrencyCode(legacy) ? legacy : 'COP';
  const parsed = stored?.preferred ?? ['USD', 'EUR', 'COP'];
  const preferred = Array.isArray(parsed) ? [...new Set(parsed.filter(isCurrencyCode))].filter(code => code !== currency).slice(0, 3) : [];
  return { currency, preferred };
}

export async function saveCurrencyPreferences(currency: string, preferred: string[]) {
  if (!isCurrencyCode(currency) || preferred.length > 3 || preferred.some(code => !isCurrencyCode(code) || code === currency) ||
      new Set(preferred).size !== preferred.length) throw new Error('Invalid currency preferences');
  await SecureStore.setItemAsync(preferencesKey, JSON.stringify({ currency, preferred }), options);
}
