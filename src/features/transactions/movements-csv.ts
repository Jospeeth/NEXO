import { amountCell, csvDocument, textCell } from '../../shared/export/csv.ts';
import type { AccountKind, Currency } from '../accounts/account';
import type { MovementKind } from './repository';

export interface MovementExportRow {
  id: number;
  accountId: number;
  accountName: string;
  accountKind: AccountKind;
  currency: Currency;
  kind: MovementKind;
  amountMinor: number;
  categoryName: string | null;
  note: string;
  transactionDate: string | null;
  recordedAt: string;
  transferGroup?: string | null;
  excludedFromReports?: number;
  excludedFromCashFlow?: number;
}

const header = 'ID,Fecha,Tipo,ID de cuenta,Cuenta,Tipo de cuenta,Moneda,Importe,Categoría,Descripción,Registrado en,Grupo de transferencia,Excluido de informes,Excluido de flujo';

export function movementsCsv(rows: readonly MovementExportRow[]) {
  const lines = rows.map(row => [
    row.id, textCell(row.transactionDate ?? ''), row.transferGroup ? 'Transferencia' : row.kind === 'income' ? 'Ingreso' : 'Gasto',
    row.accountId, textCell(row.accountName), textCell(row.accountKind), row.currency,
    amountCell(row.kind === 'expense' ? -row.amountMinor : row.amountMinor), textCell(row.categoryName ?? 'Sin categoría'),
    textCell(row.note), textCell(row.recordedAt), textCell(row.transferGroup ?? ''),
    row.excludedFromReports ? 1 : 0, row.excludedFromCashFlow ? 1 : 0,
  ].join(','));
  return csvDocument(header, lines);
}
