import { fetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';
import { bogotaSlot, isQuote, parseRate, type ExchangeQuote } from './rate';

const keyName = 'nexo.exchange.apilayer.key';
const slotName = 'nexo.exchange.apilayer.slot';
const quoteName = 'nexo.exchange.apilayer.quote';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function saveExchangeKey(key: string) {
  await SecureStore.setItemAsync(keyName, key.trim(), options);
}

export async function readQuote(): Promise<ExchangeQuote | null> {
  const saved = await SecureStore.getItemAsync(quoteName);
  if (!saved) return null;
  try {
    const value: unknown = JSON.parse(saved);
    return isQuote(value) ? value : null;
  } catch {
    return null;
  }
}

export type RateStatus = 'updated' | 'unconfigured' | 'scheduled' | 'failed';
let pending: Promise<RateStatus> | undefined;

async function requestIfDue(): Promise<RateStatus> {
  const key = await SecureStore.getItemAsync(keyName);
  if (!key) return 'unconfigured';
  const slot = bogotaSlot(Date.now());
  const previous = await SecureStore.getItemAsync(slotName);
  if (previous !== null && Number(previous) >= slot) return 'scheduled';

  // Reserve before sending. Failed or interrupted requests can still use quota.
  await SecureStore.setItemAsync(slotName, String(slot), options);
  const url = new URL('https://api.exchangeratesapi.io/v1/latest');
  url.searchParams.set('access_key', key);
  url.searchParams.set('symbols', 'USD,COP');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url.toString(), { signal: controller.signal, redirect: 'error' });
    if (!response.ok) return 'failed';
    const quote = parseRate(await response.json(), Date.now());
    const cached = await readQuote();
    if (!cached || quote.quotedAt >= cached.quotedAt) {
      await SecureStore.setItemAsync(quoteName, JSON.stringify(quote), options);
    }
    return 'updated';
  } catch {
    return 'failed';
  } finally {
    clearTimeout(timeout);
  }
}

export function refreshExchangeRate() {
  pending ??= requestIfDue().catch((): RateStatus => 'failed').finally(() => { pending = undefined; });
  return pending;
}

const manualName = 'nexo.exchange.manual';
const currencyName = 'nexo.exchange.currency';

export async function readExchangeSettings() {
  const [provider, rawManual, currency, key] = await Promise.all([
    readQuote(), SecureStore.getItemAsync(manualName),
    SecureStore.getItemAsync(currencyName), SecureStore.getItemAsync(keyName),
  ]);
  let manual: ExchangeQuote | null = null;
  if (rawManual) {
    try {
      const parsed: unknown = JSON.parse(rawManual);
      if (isQuote(parsed)) manual = parsed;
    } catch {
      // A malformed preference does not prevent use of the provider cache.
    }
  }
  const primaryCurrency: 'USD' | 'COP' | null = currency === 'USD' || currency === 'COP' ? currency : null;
  return { quote: manual ?? provider, manual: manual !== null, currency: primaryCurrency, hasKey: Boolean(key) };
}

export async function saveManualRate(rate: number | null) {
  if (rate === null) {
    await SecureStore.deleteItemAsync(manualName, options);
    return;
  }
  const quote = { copPerUsd: rate, quotedAt: Date.now() };
  if (!isQuote(quote)) throw new Error('invalid manual rate');
  await SecureStore.setItemAsync(manualName, JSON.stringify(quote), options);
}

export function savePrimaryCurrency(currency: 'USD' | 'COP') {
  return SecureStore.setItemAsync(currencyName, currency, options);
}
