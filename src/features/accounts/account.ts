export const currencies = ['COP', 'USD', 'EUR'] as const;
export type Currency = string;
export interface Account {
  currency: Currency;
  openingMinor: number;
}

// Store amounts with two minor-unit digits.
export function parseOpening(text: string): number | null {
  const match = /^(-?)(\d+)(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const minor = Number((match[1] ?? '') + (match[2] ?? '') + (match[3] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(minor) && Math.abs(minor) <= 99999999999999 ? minor : null;
}

export function displayBalance(account: Account) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency: account.currency, currencyDisplay: 'code'
  }).format(account.openingMinor / 100);
}

export const accountKinds = {
  checking: 'Cuenta corriente',
  savings: 'Cuenta de ahorros',
  cash: 'Efectivo',
  credit: 'Préstamo',
  credit_card: 'Tarjeta de crédito',
  investment: 'Inversión',
} as const;

export type AccountKind = keyof typeof accountKinds;

export interface AccountDetails extends Account {
  budgetMinor?: number | null;
  statementDay?: number | null;
  paymentDay?: number | null;
  cardProfile?: string | null;
  color?: string | null;
  name: string;
  kind: AccountKind;
}

export interface SavedAccount extends AccountDetails {
  id: number;
  balanceMinor: number;
  monthSpentMinor?: number;
}
