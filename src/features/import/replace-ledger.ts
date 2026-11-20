import { MissingKey, SQLCipherUnavailable } from '../../infrastructure/storage/unlock';
import { database } from '../../infrastructure/storage/database';
import type { ImportPlan } from './parker-csv';
import { writeLedger } from './write-ledger';

export class LedgerImportError extends Error {
  readonly stage: 'open' | 'write';
  readonly reason: 'busy' | 'constraint' | 'storage' | 'missing-key' | 'unsupported-build' | 'unknown';

  constructor(stage: LedgerImportError['stage'], error: unknown) {
    super(stage);
    this.stage = stage;
    const description = String(error).toLowerCase();
    this.reason = error instanceof MissingKey ? 'missing-key'
      : error instanceof SQLCipherUnavailable ? 'unsupported-build'
        : /busy|locked/.test(description) ? 'busy'
      : /constraint|foreign key/.test(description) ? 'constraint'
        : /full|disk|readonly|read.only/.test(description) ? 'storage' : 'unknown';
  }
}

export async function replaceLedger(plan: ImportPlan) {
  const db = await database().catch(error => { throw new LedgerImportError('open', error); });
  try {
    writeLedger(db, plan);
  } catch (error) {
    throw new LedgerImportError('write', error);
  }
}
