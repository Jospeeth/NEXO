import { shareCsv } from '../../shared/export/share-csv';
import { movementsCsv } from './movements-csv';
import { loadMovementsForExport } from './repository';

export async function exportMovements() {
  const rows = await loadMovementsForExport();
  if (!rows.length) return false;
  await shareCsv('NEXO-Movimientos.csv', movementsCsv(rows));
  return true;
}
