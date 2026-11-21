import { localDay } from '../../shared/date/local-day';
import { parseOpening, type AccountKind, type SavedAccount } from './account';
import { canonicalInstitution, creditProduct } from './institutions';
import { isCalendarDate, readCardProfile, type CardProfile, type Finish, type FeeFrequency } from './card-profile';

export interface CustomDraft {
  institution: string;
  finish?: Finish;
  lastFour: string;
  limit: string;
  interest: string;
  installments: string;
  feeEnabled: boolean;
  feeAmount: string;
  feeCurrency: string;
  frequency: FeeFrequency;
  start: string;
  next: string;
  waived: boolean;
  waiverUntil: string;
}

export function customDraft(account?: SavedAccount): CustomDraft {
  const profile = readCardProfile(account?.cardProfile);
  const today = localDay();
  return {
    institution: profile.institution ?? '', finish: profile.finish, lastFour: profile.lastFour ?? '',
    limit: profile.creditLimitMinor ? String(profile.creditLimitMinor / 100) : '',
    interest: String(profile.interestPercent ?? ''), installments: String(profile.installments ?? ''),
    feeEnabled: !!profile.fee, feeAmount: profile.fee ? String(profile.fee.minor / 100) : '',
    feeCurrency: profile.fee?.currency ?? '', frequency: profile.fee?.frequency ?? 'monthly',
    start: profile.fee?.start ?? today, next: profile.fee?.next ?? today,
    waived: !!profile.fee?.waiverUntil, waiverUntil: profile.fee?.waiverUntil ?? today,
  };
}

export function serializeCustomization(draft: CustomDraft, kind: AccountKind, currency: string) {
  const institution = canonicalInstitution(draft.institution);
  if (creditProduct(institution) && kind !== 'credit_card') return { error: 'Selecciona Tarjeta de crédito para este producto.' };
  if (draft.lastFour && !/^\d{4}$/.test(draft.lastFour)) return { error: 'Introduce exactamente cuatro dígitos.' };
  const profile: CardProfile = { institution: institution || undefined, finish: draft.finish, lastFour: draft.lastFour || undefined };
  if (kind === 'credit_card') {
    const limit = draft.limit.trim() ? parseOpening(draft.limit) : null;
    if (draft.limit.trim() && (limit === null || limit <= 0)) return { error: 'Introduce un cupo de crédito mayor que cero.' };
    const interestText = draft.interest.trim().replace(',', '.');
    const interest = interestText ? Number(interestText) : undefined;
    if (interest !== undefined && (!/^\d+(\.\d+)?$/.test(interestText) || interest < 0 || interest > 100)) {
      return { error: 'Introduce una tasa mensual entre 0 y 100.' };
    }
    const installments = draft.installments ? Number(draft.installments) : undefined;
    if (installments !== undefined && (!/^\d+$/.test(draft.installments) || installments < 1 || installments > 120)) {
      return { error: 'Introduce entre 1 y 120 cuotas.' };
    }
    profile.creditLimitMinor = limit ?? undefined;
    profile.interestPercent = interest;
    profile.installments = installments;
    if (draft.feeEnabled) {
      const minor = parseOpening(draft.feeAmount);
      if (minor === null || minor <= 0) return { error: 'Introduce una cuota de manejo mayor que cero.' };
      if (!isCalendarDate(draft.start) || !isCalendarDate(draft.next) || draft.next < draft.start ||
          (draft.waived && (!isCalendarDate(draft.waiverUntil) || draft.waiverUntil < draft.start))) {
        return { error: 'Revisa las fechas de la cuota de manejo.' };
      }
      profile.fee = { minor, currency: draft.feeCurrency || currency, frequency: draft.frequency,
        start: draft.start, next: draft.next, waiverUntil: draft.waived ? draft.waiverUntil : null };
    }
  }
  return { serialized: JSON.stringify(profile) };
}
