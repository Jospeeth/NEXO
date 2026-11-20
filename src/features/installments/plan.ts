export function paymentDate(firstDue: string, offset: number): string {
  const [year = 1970, month = 1, day = 1] = firstDue.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function fixedPaymentPlan(principal: number, count: number, monthlyRate: number, firstDue: string) {
  if (!Number.isSafeInteger(principal) || principal <= 0 ||
      !Number.isInteger(count) || count < 1 || count > 120 ||
      !Number.isFinite(monthlyRate) || monthlyRate < 0 || monthlyRate > 1) return null;

  const scheduled = monthlyRate === 0 ? principal / count
    : principal * monthlyRate / -Math.expm1(-count * Math.log1p(monthlyRate));
  const estimated = Math.round(scheduled);
  if (!Number.isSafeInteger(estimated * count + count) || principal < count) return null;
  let remaining = principal;
  const rows = Array.from({ length: count }, (_, index) => {
    const interest = Math.round(remaining * monthlyRate);
    const capital = index === count - 1 ? remaining
      : Math.min(remaining - (count - index - 1), Math.max(0, estimated - interest));
    remaining -= capital;
    return { number: index + 1, date: paymentDate(firstDue, index), capital, interest, payment: capital + interest, remaining };
  });
  const interest = rows.reduce((sum, row) => sum + row.interest, 0);
  return { estimated, interest, total: principal + interest, rows };
}
