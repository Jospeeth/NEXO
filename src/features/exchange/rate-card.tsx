import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLanguage } from '../../shared/language/language';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { Pill } from '../../shared/ui/date-controls';
import { saveCurrencyPreferences } from './repository';
import { currencyFlag, exchangeRate } from './rate';
import { useExchange } from './use-exchange';
import { CurrencyPicker } from './currency-picker';

export function ExchangeRateCard() {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const { settings, reload } = useExchange();
  const [busy, setBusy] = useState(false);
  const primary = settings?.currency ?? 'COP';
  const preferred = settings?.preferred ?? [];
  const quote = settings?.quote ?? null;

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try { await action(); }
    catch { Alert.alert(t('No se pudo guardar o actualizar la configuración.')); }
    finally { setBusy(false); }
  }

  function save(currency: string, favorites: string[]) {
    void run(async () => {
      await saveCurrencyPreferences(currency, favorites);
      await reload();
    });
  }

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
  const number = new Intl.NumberFormat(locale, { maximumSignificantDigits: 7 });
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ padding: spacing.md, borderRadius: radius.card, backgroundColor: colors.surface, gap: spacing.sm }}>
        <CurrencyPicker label={t('Moneda principal')} value={primary} disabled={busy || !settings}
          onChange={code => save(code, preferred.map(item => item === code ? primary : item))} />
        <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: '700' }}>{t('Monedas preferidas')}</Text>
        {preferred.map((code, index) => <View key={code} style={{ gap: spacing.xs }}>
          <CurrencyPicker label={`${t('Preferida')} ${index + 1}`} value={code} disabled={busy}
            excluded={[primary, ...preferred.filter(item => item !== code)]}
            onChange={next => save(primary, preferred.map(item => item === code ? next : item))} />
          <Pill label={`${t('Quitar')} ${code}`} disabled={busy} onPress={() => save(primary, preferred.filter(item => item !== code))} />
        </View>)}
        {preferred.length < 3 && <CurrencyPicker label={t('Agregar moneda')} disabled={busy || !settings}
          excluded={[primary, ...preferred]} onChange={code => save(primary, [...preferred, code])} />}
      </View>
      <View style={{ padding: spacing.md, borderRadius: radius.card, backgroundColor: colors.surface, gap: spacing.sm }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: '700' }}>{t('Tasas de referencia')} · Frankfurter</Text>
        {settings?.stale && <Text style={{ color: colors.secondaryText }}>{t('Sin conexión con Frankfurter. Se muestran las tasas guardadas cuando están disponibles.')}</Text>}
        {!quote && <Text style={{ color: colors.secondaryText }}>{t('Sin cotizaciones disponibles.')}</Text>}
        {preferred.map(code => {
          const rate = exchangeRate(quote, code, primary);
          const dates = [quote?.rates[code]?.date, quote?.rates[primary]?.date].filter((value): value is string => !!value).sort();
          return <View key={code} style={{ paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
            <Text style={{ color: colors.text }}>{currencyFlag(code)} {code} · {rate === null ? '—' : `${number.format(rate)} ${primary}`}</Text>
            {!!dates[0] && <Text style={{ color: colors.secondaryText }}>
              {t('Fecha de la tasa')} · {dateFormat.format(new Date(dates[0] + 'T00:00:00Z'))}
            </Text>}
          </View>;
        })}
        <Pill label={t('Actualizar tasa')} disabled={busy} onPress={() => { void run(() => reload(true)); }} />
      </View>
    </View>
  );
}
