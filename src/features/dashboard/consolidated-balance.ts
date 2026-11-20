import type { SavedAccount } from '../accounts/account';
import type { ExchangeQuote } from '../exchange/rate';

export type ConsolidatedCurrency = 'COP' | 'USD';

export function consolidatedBalance(
  accounts: readonly Pick<SavedAccount, 'currency' | 'balanceMinor'>[],
  currency: ConsolidatedCurrency,
  quote: ExchangeQuote | null
) {
  let nativeMinor = 0;
  let foreignMinor = 0;
  for (const account of accounts) {
    if (account.currency === currency) nativeMinor += account.balanceMinor;
    else if (account.currency === 'COP' || account.currency === 'USD') foreignMinor += account.balanceMinor;
    else return { kind: 'unsupported-currency' } as const;
  }
  if (foreignMinor !== 0 && !quote) return { kind: 'missing-rate' } as const;

  const converted = quote
    ? Math.round(currency === 'COP' ? foreignMinor * quote.copPerUsd : foreignMinor / quote.copPerUsd)
    : 0;
  const minor = nativeMinor + converted;
  if (!Number.isSafeInteger(nativeMinor) || !Number.isSafeInteger(foreignMinor) ||
      !Number.isSafeInteger(converted) || !Number.isSafeInteger(minor)) {
    return { kind: 'out-of-range' } as const;
  }
  return { kind: 'available', minor, usedQuote: foreignMinor !== 0 && quote !== null } as const;
}
