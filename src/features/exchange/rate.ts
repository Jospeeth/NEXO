export interface ExchangeQuote {
  rates: Record<string, { rate: number; date: string }>;
  fetchedAt: number;
}
export interface CurrencyEntry { iso_code: string; name: string }

export const defaultCurrencies = [
  { iso_code: 'COP', name: 'Colombian Peso' },
  { iso_code: 'USD', name: 'US Dollar' },
  { iso_code: 'EUR', name: 'Euro' },
  { iso_code: 'GBP', name: 'British Pound' },
];

export const isCurrencyCode = (value: unknown): value is string => typeof value === 'string' && /^[A-Z]{3}$/.test(value);
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function parseRates(payload: unknown, fetchedAt: number, through: string): ExchangeQuote {
  if (!Array.isArray(payload)) throw new Error('Invalid rate response');
  const rates: ExchangeQuote['rates'] = {};
  for (const row of payload) {
    if (row?.base !== 'USD' || !isCurrencyCode(row.quote) || row.quote === 'USD' || !isDate(row.date) ||
        row.date > through || typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0) continue;
    if (!rates[row.quote] || rates[row.quote]!.date < row.date) rates[row.quote] = { rate: row.rate, date: row.date };
  }
  if (!Object.keys(rates).length) throw new Error('Invalid rate response');
  return { rates, fetchedAt };
}

export function parseCatalog(payload: unknown): CurrencyEntry[] {
  if (!Array.isArray(payload)) throw new Error('Invalid currency catalog');
  const entries = new Map<string, CurrencyEntry>();
  for (const row of payload) {
    const code = row?.iso_code ?? row?.code;
    if ((row?.type === 'currency' || row?.type === undefined) && isCurrencyCode(code) && typeof row.name === 'string' && row.name.trim()) {
      entries.set(code, { iso_code: code, name: row.name });
    }
  }
  if (!entries.size) throw new Error('Empty currency catalog');
  return [...entries.values()].sort((a, b) => a.iso_code.localeCompare(b.iso_code));
}

export function exchangeRate(quote: ExchangeQuote | null, from: string, to: string): number | null {
  if (from === to) return 1;
  const source = from === 'USD' ? 1 : quote?.rates[from]?.rate;
  const target = to === 'USD' ? 1 : quote?.rates[to]?.rate;
  return source && target ? target / source : null;
}

export function currencyFlag(code: string) {
  const region = code.startsWith('X') ? '' : code.slice(0, 2);
  return region ? String.fromCodePoint(...Array.from(region, char => 127397 + char.charCodeAt(0))) : '¤';
}
