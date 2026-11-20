import type { SavedAccount, Currency } from '../accounts/account';
import type { Movement } from '../transactions/repository';

export function summarize(
  accounts: SavedAccount[], movements: Movement[], period: string,
  currency: Currency, today: string
) {
  const matchingAccounts = accounts.filter(account => account.currency === currency);
  const ids = new Set(matchingAccounts.map(account => account.id));
  const available = matchingAccounts.reduce((sum, account) => sum + account.balanceMinor, 0);
  // Account opening amounts have no effective date in the current account flow.
  let openingBalance = matchingAccounts.reduce((sum, account) => sum + account.openingMinor, 0);
  const expenses = new Map<number | null, { label: string; minor: number }>();
  let income = 0;
  let expense = 0;
  let netCashFlow = 0;
  let balanceChange = 0;
  for (const item of movements) {
    if (!ids.has(item.accountId) || !item.transactionDate || item.transactionDate > today) continue;
    const movementPeriod = item.transactionDate.slice(0, 7);
    if (movementPeriod < period) {
      openingBalance += item.kind === 'income' ? item.amountMinor : -item.amountMinor;
      continue;
    }
    if (movementPeriod !== period) continue;
    const signed = item.kind === 'income' ? item.amountMinor : -item.amountMinor;
    balanceChange += signed;
    if (item.transferGroup) continue;
    if (!item.excludedFromCashFlow) netCashFlow += signed;
    if (item.excludedFromReports) continue;
    if (item.kind === 'income') {
      income += item.amountMinor;
    } else {
      expense += item.amountMinor;
      const label = `${item.categoryEmoji ?? '📦'} ${item.categoryName ?? 'Sin categoría'}`;
      const categoryId = item.categoryId ?? null;
      expenses.set(categoryId, { label, minor: (expenses.get(categoryId)?.minor ?? 0) + item.amountMinor });
    }
  }
  const futurePeriod = period > today.slice(0, 7);
  return {
    available, expenses, income, expense, netCashFlow,
    openingBalance: futurePeriod ? null : openingBalance,
    closingBalance: futurePeriod ? null : openingBalance + balanceChange,
    isCurrentPeriod: period === today.slice(0, 7),
  };
}
