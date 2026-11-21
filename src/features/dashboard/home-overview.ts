import type { Currency, SavedAccount } from '../accounts/account';
import type { ExchangeQuote } from '../exchange/rate';
import type { Movement } from '../transactions/repository';
import { consolidatedBalance, type ConsolidatedCurrency } from './consolidated-balance.ts';
import { summarize } from './summary.ts';

const unavailable = { kind: 'historical-unavailable' } as const;
type Value = ReturnType<typeof consolidatedBalance> | typeof unavailable;

export function homeOverview(
  accounts: SavedAccount[], movements: Movement[], today: string,
  currency: ConsolidatedCurrency, quote: ExchangeQuote | null, month = today.slice(0, 7),
) {
  const currentMonth = today.slice(0, 7);
  const isCurrent = month === currentMonth;
  const future = month > currentMonth;
  const [year, monthNumber] = month.split('-').map(Number);
  const end = isCurrent ? today : `${month}-${new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate()}`;
  const periodMovements = future ? [] : movements.filter(item => item.transactionDate.startsWith(month + '-') && item.transactionDate <= end);
  const snapshots = new Map(accounts.map(account => [account.id, {
    opening: account.openingMinor, closing: account.openingMinor, budgetSpent: 0,
    hasOpeningEvidence: account.openingMinor === 0, hasClosingEvidence: account.openingMinor === 0,
  }]));
  for (const item of movements) {
    const snapshot = snapshots.get(item.accountId);
    if (!snapshot || !item.transactionDate || item.transactionDate > end) continue;
    const signed = item.kind === 'income' ? item.amountMinor : -item.amountMinor;
    snapshot.closing += signed;
    snapshot.hasClosingEvidence = true;
    if (item.transactionDate < month + '-01') {
      snapshot.opening += signed;
      snapshot.hasOpeningEvidence = true;
    } else if (item.kind === 'expense' && !item.transferGroup && !item.excludedFromReports) {
      snapshot.budgetSpent += item.amountMinor;
    }
  }
  const accountRows = accounts.map(account => {
    const snapshot = snapshots.get(account.id)!;
    const opening = !future && snapshot.hasOpeningEvidence ? snapshot.opening : null;
    const closing = isCurrent ? account.balanceMinor : !future && snapshot.hasClosingEvidence ? snapshot.closing : null;
    return { account, opening, closing, budgetSpent: future ? 0 : snapshot.budgetSpent };
  });
  const currencies = [...new Set<Currency>(accounts.map(account => account.currency))];
  const summarizeAsOf = (day: string) => currencies.map(source => ({
    currency: source, ...summarize(accounts, periodMovements, month, source, day),
  }));
  const totals = summarizeAsOf(future ? today : end);
  function convert(values: { currency: Currency; balanceMinor: number }[]) {
    return consolidatedBalance(values.filter(row => row.balanceMinor !== 0), currency, quote);
  }
  function historical(key: 'opening' | 'closing'): Value {
    if (future || accountRows.some(row => row[key] === null)) return unavailable;
    return convert(accountRows.map(row => ({ currency: row.account.currency, balanceMinor: row[key] ?? 0 })));
  }
  const metric = (key: 'income' | 'expense' | 'netCashFlow', values = totals) =>
    convert(values.map(row => ({ currency: row.currency, balanceMinor: row[key] })));
  const balance = historical('closing');
  const previous = historical('opening');
  const income = metric('income');
  const expense = metric('expense');
  const trend = balance.kind === 'available' && previous.kind === 'available' && previous.minor !== 0
    ? (balance.minor - previous.minor) / Math.abs(previous.minor) : null;
  const lastDay = Number(end.slice(8));
  const days = future ? [] : [...new Set(Array.from({ length: 5 }, (_, i) => 1 + Math.round(i * (lastDay - 1) / 4)))];
  const flow = days.map(day => {
    const values = day === lastDay ? totals : summarizeAsOf(`${month}-${String(day).padStart(2, '0')}`);
    return { day, income: metric('income', values), expense: metric('expense', values) };
  });
  const categoryLabels = new Map(totals.flatMap(row => [...row.expenses].map(([id, { label }]) => [id, label] as const)));
  const categories = [...categoryLabels].map(([id, label]) => ({
    id, label, value: convert(totals.map(row => ({ currency: row.currency, balanceMinor: row.expenses.get(id)?.minor ?? 0 }))),
  }));
  return { balance, previous, income, expense, trend, flow, accountRows, periodMovements,
    netCashFlow: metric('netCashFlow'), categories, isCurrent, future };
}

export type HomeOverview = ReturnType<typeof homeOverview>;

export function homeMoney(value: Value | undefined, currency: ConsolidatedCurrency, locale: string) {
  if (value?.kind !== 'available') return '—';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(value.minor / 100);
}
