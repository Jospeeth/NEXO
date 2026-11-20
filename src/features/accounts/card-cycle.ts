export function parseBillingDay(value: string): number | null | undefined {
  const text = value.trim();
  if (!text) return null;
  const day = /^\d{1,2}$/.test(text) ? Number(text) : NaN;
  return day >= 1 && day <= 31 ? day : undefined;
}

export function cardCycleDates(date: string, statementDay: number, paymentDay: number) {
  const [year = 0, month = 1] = date.split('-').map(Number);
  function dayOfMonth(offset: number, day: number) {
    const first = new Date(Date.UTC(year, month - 1 + offset, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    first.setUTCDate(Math.min(day, lastDay));
    return first.toISOString().slice(0, 10);
  }

  const offset = dayOfMonth(0, statementDay) < date ? 1 : 0;
  const statement = dayOfMonth(offset, statementDay);
  const payment = dayOfMonth(offset, paymentDay);
  return { statement, payment: payment > statement ? payment : dayOfMonth(offset + 1, paymentDay) };
}
