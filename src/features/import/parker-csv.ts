type Currency = 'COP' | 'USD' | 'EUR';

export interface ImportPlan {
  accounts: { key: string; name: string; currency: Currency }[];
  categories: { key: string; name: string; kind: 'income' | 'expense' | 'both' }[];
  movements: {
    accountKey: string; categoryKey: string; recordedAt: string; date: string; amountMinor: number;
    note: string; kind: 'income' | 'expense'; transferGroup: string; excludeReports: boolean; excludeCashFlow: boolean;
  }[];
  transfers: number;
}

export class CsvImportError extends Error {
  readonly code: 'format' | 'row' | 'transfer' | 'empty';
  readonly row?: number;

  constructor(code: CsvImportError['code'], row?: number) {
    super(code);
    this.code = code;
    this.row = row;
  }
}

function readRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let closed = false;
  const source = text.replace(/^\uFEFF/, '');
  function finishField() {
    row.push(field);
    field = '';
    closed = false;
  }
  function finishRow() {
    finishField();
    if (row.some(value => value.trim())) rows.push(row);
    if (rows.length > 10001) throw new CsvImportError('format');
    row = [];
  }
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else {
        field += char;
      }
    } else if (char === ',') {
      finishField();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index++;
      finishRow();
    } else if (char === '"' && !field && !closed) {
      quoted = true;
    } else {
      if (closed || char === '"' || char === '\0') throw new CsvImportError('format');
      field += char;
    }
  }
  if (quoted) throw new CsvImportError('format');
  finishRow();
  return rows;
}

const required = ['Date', 'Type', 'Amount', 'Currency', 'Account', 'Category', 'Note',
  'Transfer direction', 'Excluded from reports', 'Excluded from cash flow', 'ID',
  'Account ID', 'Category ID', 'Transfer group', 'Split parent', 'Parent ID'] as const;

export function parseParkerCsv(text: string, timeZone: string): ImportPlan {
  const [headers, ...rows] = readRows(text);
  if (!headers || new Set(headers).size !== headers.length || required.some(name => !headers.includes(name))) {
    throw new CsvImportError('format');
  }
  if (!rows.length) throw new CsvImportError('empty');
  const columns = new Map(headers.map((name, index) => [name, index]));
  const dateFormat = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone });
  const accounts = new Map<string, ImportPlan['accounts'][number]>();
  const categories = new Map<string, ImportPlan['categories'][number]>();
  const seen = new Set<string>();
  const groups = new Map<string, ImportPlan['movements']>();
  const movements = rows.map((row, index): ImportPlan['movements'][number] => {
    const invalid = () => { throw new CsvImportError('row', index + 2); };
    if (row.length !== headers.length) invalid();
    const value = (name: typeof required[number]) => row[columns.get(name) ?? -1] ?? '';
    const id = value('ID').trim();
    const accountKey = value('Account ID').trim();
    const name = value('Account').trim();
    const currency = value('Currency').trim().toUpperCase();
    const type = value('Type').trim();
    const direction = value('Transfer direction').trim();
    const transferGroup = value('Transfer group').trim();
    const reports = value('Excluded from reports').trim();
    const cashFlow = value('Excluded from cash flow').trim();
    const note = value('Note');
    const split = value('Split parent').trim();
    if (!id || seen.has(id) || !accountKey || !name || name.length > 60 || note.length > 120 ||
        note.includes('\0') || split !== 'false' || value('Parent ID').trim() ||
        !['true', 'false'].includes(reports) || !['true', 'false'].includes(cashFlow)) invalid();
    seen.add(id);
    if (currency !== 'COP' && currency !== 'USD' && currency !== 'EUR') throw new CsvImportError('row', index + 2);
    const prior = accounts.get(accountKey);
    if (prior && (prior.name !== name || prior.currency !== currency)) invalid();
    accounts.set(accountKey, { key: accountKey, name, currency });

    if (type === 'transfer') {
      if (!transferGroup || (direction !== 'incoming' && direction !== 'outgoing')) invalid();
    } else if ((type !== 'income' && type !== 'expense') || direction || transferGroup) invalid();
    const kind = type === 'income' || direction === 'incoming' ? 'income' : 'expense';

    const amount = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value('Amount').trim());
    const amountMinor = amount?.[1] ? Number(amount[1] + (amount[2] ?? '').padEnd(2, '0')) : 0;
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 1 || amountMinor > 99999999999999) invalid();

    const recordedAt = value('Date').trim();
    const timestamp = new Date(recordedAt);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(recordedAt) ||
        !Number.isFinite(timestamp.valueOf()) || timestamp.toISOString() !== recordedAt) invalid();
    const parts = dateFormat.formatToParts(timestamp);
    const date = ['year', 'month', 'day'].map(part => parts.find(item => item.type === part)?.value).join('-');
    const categoryName = value('Category').trim();
    const categoryKey = categoryName ? value('Category ID').trim() || categoryName : '';
    if (categoryName.length > 40) invalid();
    if (categoryKey) {
      const previous = categories.get(categoryKey);
      if (previous && previous.name !== categoryName) invalid();
      categories.set(categoryKey, { key: categoryKey, name: categoryName,
        kind: previous && previous.kind !== kind ? 'both' : kind });
    }

    const movement = { accountKey, categoryKey, recordedAt, date, amountMinor, note, kind,
      transferGroup, excludeReports: reports === 'true', excludeCashFlow: cashFlow === 'true' } as const;
    if (transferGroup) {
      const group = groups.get(transferGroup) ?? [];
      group.push(movement);
      groups.set(transferGroup, group);
    }
    return movement;
  });

  for (const [first, second, extra] of groups.values()) {
    if (!first || !second || extra || first.accountKey === second.accountKey || first.kind === second.kind ||
        first.date !== second.date ||
        (accounts.get(first.accountKey)?.currency === accounts.get(second.accountKey)?.currency && first.amountMinor !== second.amountMinor)) {
      throw new CsvImportError('transfer');
    }
  }

  return { accounts: [...accounts.values()], categories: [...categories.values()], movements, transfers: groups.size };
}
