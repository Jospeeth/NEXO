import { creditProduct } from './institutions';
import { useRouter } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { localDay } from '../../shared/date/local-day';
import { useLanguage } from '../../shared/language/language';
import { useTheme, spacing, radius } from '../../shared/theme/theme';
import { Pill } from '../../shared/ui/date-controls';
import { consolidatedBalance } from '../dashboard/consolidated-balance';
import type { ExchangeQuote } from '../exchange/rate';
import type { Movement } from '../transactions/repository';
import { displayBalance, type SavedAccount } from './account';
import { annualFee, nextFeeDate, readCardProfile } from './card-profile';

export function CardFeeSummary({ account, movements, quote, ready }: {
  account: SavedAccount; movements: Movement[]; quote: ExchangeQuote | null; ready: boolean;
}) {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const profile = readCardProfile(account.cardProfile);
  const fee = profile.fee;
  const product = profile.institution ? creditProduct(profile.institution) : undefined;
  const today = localDay();
  const recorded = new Set(movements.flatMap(item => item.accountId === account.id && item.feeOccurrence ? [item.feeOccurrence] : []));
  const next = fee ? nextFeeDate(fee, today, recorded) : null;
  const waived = !!fee?.waiverUntil && today >= fee.start && today <= fee.waiverUntil;
  const formatDate = (date: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(date + 'T00:00:00Z'));

  return <View style={{ padding: spacing.md, gap: spacing.xs, borderRadius: radius.card, backgroundColor: colors.surface }}>
    <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: '700' }}>{t('Cuota de manejo')}</Text>
    {product && <Text style={{ color: colors.secondaryText }}>{t('Emisor')} · {product.issuer}</Text>}
    {profile.creditLimitMinor !== undefined && <Text style={{ color: colors.text }}>
      {t('Cupo de crédito')} · {displayBalance({ currency: account.currency, openingMinor: profile.creditLimitMinor })}
    </Text>}
    {!fee && <Text style={{ color: colors.secondaryText }}>{t('Sin cuota configurada')}</Text>}
    {fee && next && <>
      <Text style={{ color: colors.text }}>{t('Costo anual estimado')} · {displayBalance({ currency: fee.currency, openingMinor: annualFee(fee) })}</Text>
      {waived && fee.waiverUntil && <Text style={{ color: colors.income }}>{t('Cuota exonerada')} · {formatDate(fee.waiverUntil)}</Text>}
      <Text style={{ color: colors.secondaryText }}>{t('Próximo cobro proyectado')} · {formatDate(next)}</Text>
      <Pill label={t('Registrar cobro real')} disabled={!ready || waived} onPress={() => {
        const amount = consolidatedBalance([{ currency: fee.currency, balanceMinor: fee.minor }], account.currency, quote);
        if (amount.kind !== 'available' || amount.minor < 1) {
          Alert.alert(t('No hay tasa disponible para convertir la cuota.'));
          return;
        }
        router.push({ pathname: '/add', params: { mode: 'management-fee', accountId: String(account.id),
          amountMinor: String(amount.minor), occurrence: next, currency: account.currency } });
      }} />
    </>}
  </View>;
}
