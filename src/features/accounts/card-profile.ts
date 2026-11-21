export const metallicFinishes = {
  titanium: ['Titanium Silver', '#8F98A3', '#28323B', '#596775'],
  champagne: ['Champagne Gold', '#D6B77A', '#382811', '#79613A'],
  rose: ['Rose Gold', '#C98F86', '#4D2228', '#84504F'],
  obsidian: ['Obsidian Black', '#17191F', '#101116', '#4D4E59'],
  royal: ['Royal Purple', '#6737C7', '#241348', '#704AB3'],
  sapphire: ['Sapphire Blue', '#2454A6', '#132449', '#3D6398'],
  emerald: ['Emerald Green', '#16866F', '#0D332C', '#38776B'],
  burgundy: ['Burgundy Red', '#862E49', '#3D1426', '#96506A'],
  copper: ['Copper Bronze', '#B67548', '#462B23', '#895640'],
  arctic: ['Arctic Platinum', '#C7D3DE', '#253747', '#586C7D'],
  onyx: ['Onyx Black', '#343640', '#0A0B10', '#303342'],
  orange: ['Burnt Orange', '#F88132', '#4B230F', '#935023'],
  green: ['Forest Green', '#339451', '#123220', '#3B6D49'],
  yellow: ['Amber Yellow', '#F1C83D', '#4B3509', '#806018'],
  teal: ['Deep Teal', '#2DADB5', '#0F3539', '#356A70'],
  plum: ['Metallic Plum', '#A3498E', '#38213B', '#75416D'],
} as const;
export type Finish = keyof typeof metallicFinishes;

export const feeMonths = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 } as const;
export type FeeFrequency = keyof typeof feeMonths;
export interface CardFee {
  minor: number;
  currency: string;
  frequency: FeeFrequency;
  start: string;
  next: string;
  waiverUntil: string | null;
}
export interface CardProfile {
  institution?: string;
  finish?: Finish;
  lastFour?: string;
  creditLimitMinor?: number;
  interestPercent?: number;
  installments?: number;
  fee?: CardFee;
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function readCardProfile(raw: string | null | undefined): CardProfile {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as CardProfile | null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const fee = value.fee;
    return {
      institution: typeof value.institution === 'string' ? value.institution.slice(0, 80) : undefined,
      finish: typeof value.finish === 'string' && Object.hasOwn(metallicFinishes, value.finish) ? value.finish : undefined,
      lastFour: typeof value.lastFour === 'string' && /^\d{4}$/.test(value.lastFour) ? value.lastFour : undefined,
      creditLimitMinor: Number.isSafeInteger(value.creditLimitMinor) && (value.creditLimitMinor ?? 0) > 0 ? value.creditLimitMinor : undefined,
      interestPercent: typeof value.interestPercent === 'number' && value.interestPercent >= 0 && value.interestPercent <= 100 ? value.interestPercent : undefined,
      installments: Number.isInteger(value.installments) && (value.installments ?? 0) >= 1 && (value.installments ?? 0) <= 120 ? value.installments : undefined,
      fee: fee && Number.isSafeInteger(fee.minor) && fee.minor > 0 && /^[A-Z]{3}$/.test(fee.currency) &&
        Object.hasOwn(feeMonths, fee.frequency) && isCalendarDate(fee.start) && isCalendarDate(fee.next) &&
        fee.next >= fee.start && (fee.waiverUntil === null || isCalendarDate(fee.waiverUntil)) ? fee : undefined,
    };
  } catch {
    return {};
  }
}

export function nextFeeDate(fee: CardFee, today: string, recorded: ReadonlySet<string>) {
  const [year = 0, month = 1, day = 1] = fee.next.split('-').map(Number);
  function occurrence(index: number) {
    const offset = month - 1 + index * feeMonths[fee.frequency];
    const date = new Date(Date.UTC(year, offset, 1));
    date.setUTCDate(Math.min(day, new Date(Date.UTC(year, offset + 1, 0)).getUTCDate()));
    return date.toISOString().slice(0, 10);
  }
  const [currentYear = year, currentMonth = month] = today.split('-').map(Number);
  let index = Math.max(0, Math.floor(((currentYear - year) * 12 + currentMonth - month) / feeMonths[fee.frequency]));
  let next = occurrence(index);
  while (next < today || (fee.waiverUntil !== null && next <= fee.waiverUntil) || recorded.has(next)) {
    next = occurrence(++index);
  }
  return next;
}

export const annualFee = (fee: CardFee) => fee.minor * (12 / feeMonths[fee.frequency]);
