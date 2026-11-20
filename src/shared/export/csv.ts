export function textCell(value: string) {
  // Quoting alone does not stop spreadsheet apps from running formulas.
  const safe = /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/u.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function amountCell(minor: number) {
  const absolute = Math.abs(minor);
  const units = Math.floor(absolute / 100);
  const cents = String(absolute % 100).padStart(2, '0');
  return (minor < 0 ? '-' : '') + units + '.' + cents;
}

export function csvDocument(header: string, lines: readonly string[]) {
  return '\uFEFF' + [header, ...lines, ''].join('\r\n');
}
