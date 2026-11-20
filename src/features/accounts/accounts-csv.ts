import { amountCell, csvDocument, textCell } from '../../shared/export/csv.ts';
import type { SavedAccount } from './account';

export function accountsCsv(accounts: readonly SavedAccount[]) {
  const lines = accounts.map(account => [
    account.id, textCell(account.name), textCell(account.kind), account.currency,
    amountCell(account.openingMinor), amountCell(account.balanceMinor), textCell(account.color ?? ''),
  ].join(','));
  return csvDocument('ID de cuenta,Cuenta,Tipo de cuenta,Moneda,Saldo inicial,Saldo actual,Color HEX', lines);
}
