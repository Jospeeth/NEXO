const hour = 3_600_000;

export interface ExchangeQuote {
  copPerUsd: number;
  quotedAt: number;
}

export function bogotaSlot(now: number) {
  return Math.floor((now - 5 * hour) / (8 * hour));
}

export function isQuote(value: unknown): value is ExchangeQuote {
  if (typeof value !== 'object' || value === null) return false;
  const quote = value as Partial<ExchangeQuote>;
  return typeof quote.copPerUsd === 'number' && Number.isFinite(quote.copPerUsd) &&
    quote.copPerUsd > 0 && typeof quote.quotedAt === 'number' &&
    Number.isFinite(quote.quotedAt) && quote.quotedAt > 0;
}

export function parseRate(payload: unknown, now: number): ExchangeQuote {
  if (typeof payload !== 'object' || payload === null) throw new Error('invalid quote');
  const { success, timestamp, rates } = payload as {
    success?: unknown; timestamp?: unknown; rates?: { USD?: unknown; COP?: unknown };
  };
  if (success !== true || typeof timestamp !== 'number' ||
      typeof rates?.USD !== 'number' || rates.USD <= 0 ||
      typeof rates.COP !== 'number' || rates.COP <= 0) throw new Error('invalid quote');
  const quote = { copPerUsd: rates.COP / rates.USD, quotedAt: timestamp * 1000 };
  if (!isQuote(quote) || quote.quotedAt > now + 5 * 60_000) throw new Error('invalid quote');
  return quote;
}

export function isStale(quote: ExchangeQuote, now: number) {
  return now - quote.quotedAt >= 24 * hour;
}
