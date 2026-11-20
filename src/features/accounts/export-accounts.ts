import { shareCsv } from '../../shared/export/share-csv';
import { accountsCsv } from './accounts-csv';
import { loadAccounts } from './repository';

export async function exportAccounts() {
  const accounts = await loadAccounts();
  if (!accounts.length) return false;
  await shareCsv('NEXO-Cuentas.csv', accountsCsv(accounts));
  return true;
}
