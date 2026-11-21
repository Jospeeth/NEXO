import type { SavedAccount, Currency } from '../accounts/account';
import { type ExchangeQuote } from '../exchange/rate.ts';

export type ConsolidatedCurrency = Currency;

export function consolidatedBalance(
  accounts: readonly Pick<SavedAccount, 'currency' | 'balanceMinor'>[],
  currency: ConsolidatedCurrency,
  quote: ExchangeQuote | null,
) {
  const byCurrency = new Map<string, number>();
  for (const account of accounts) {
    const next = (byCurrency.get(account.currency) ?? 0) + account.balanceMinor;
    if (!Number.isSafeInteger(next)) return { kind: 'out-of-range' } as const;
    byCurrency.set(account.currency, next);
  }
  let numerator = 0n;
  let denominator = 1n;
  let usedQuote = false;
  for (const [source, amount] of byCurrency) {
    if (amount === 0) continue;
    const from = source === 'USD' ? 1 : quote?.rates[source]?.rate;
    const to = currency === 'USD' ? 1 : quote?.rates[currency]?.rate;
    if (source === currency) {
      numerator += BigInt(amount) * denominator;
      continue;
    }
    if (!from || !to) return { kind: quote ? 'unsupported-currency' : 'missing-rate' } as const;
    const [fromUnits, fromScale] = decimalFraction(from);
    const [toUnits, toScale] = decimalFraction(to);
    const factor = fromUnits * toScale;
    numerator = numerator * factor + BigInt(amount) * toUnits * fromScale * denominator;
    denominator *= factor;
    usedQuote = true;
  }
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator * sign;
  const minor = Number(sign * ((2n * absolute + denominator) / (2n * denominator)));
  if (!Number.isSafeInteger(minor)) return { kind: 'out-of-range' } as const;
  return { kind: 'available', minor, usedQuote } as const;
}

function decimalFraction(value: number): readonly [bigint, bigint] {
  const [mantissa = '0', exponent = '0'] = String(value).split('e');
  const [whole = '0', fraction = ''] = mantissa.split('.');
  const places = fraction.length - Number(exponent);
  const units = BigInt(whole + fraction);
  return places > 0 ? [units, 10n ** BigInt(places)] : [units * 10n ** BigInt(-places), 1n];
}
