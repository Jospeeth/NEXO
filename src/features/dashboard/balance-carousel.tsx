import { useState } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../shared/language/language';
import { Pill } from '../../shared/ui/date-controls';
import { radius, spacing, type, useTheme } from '../../shared/theme/theme';
import { displayBalance, type Currency } from '../accounts/account';
import type { ConsolidatedCurrency } from './consolidated-balance';
import { currencyFlag } from '../exchange/rate';
import { homeMoney, type HomeOverview } from './home-overview';

interface Props {
  overview: HomeOverview;
  currency: ConsolidatedCurrency;
  stale: boolean;
  status?: string;
}

export function BalanceCarousel({ overview, currency, stale, status }: Props) {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const [mode, setMode] = useState<'native' | 'total'>('native');
  const [nativeCurrency, setNativeCurrency] = useState<Currency | null>(null);
  const source = nativeCurrency ?? currency;
  const available = [...new Set([source, ...overview.accountRows.map(row => row.account.currency)])];
  const selected = overview.accountRows.filter(row => row.account.currency === source);
  const nativeTotal = selected.reduce((total, row) => total + (row.closing ?? 0), 0);
  const nativeMissing = overview.future || selected.some(row => row.closing === null);
  const balance = overview.balance;

  return (
    <LinearGradient colors={[colors.heroGradientStart, colors.heroGradientEnd]}
      style={{ borderRadius: radius.hero, padding: spacing.md, gap: spacing.sm }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
        {t(mode === 'native' ? 'Saldo disponible por moneda' : 'Balance total')}
      </Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: '#FFFFFF', fontSize: type.balance, fontWeight: '700' }}>
        {mode === 'total' ? homeMoney(balance, currency, locale) + ' ' + currency
          : nativeMissing || !Number.isSafeInteger(nativeTotal) ? '—' : displayBalance({ currency: source, openingMinor: nativeTotal })}
      </Text>
      {mode === 'total' && (status || (balance.kind === 'available' && balance.usedQuote)) && (
        <Text style={{ color: '#FFFFFF' }}>
          {status ?? `${t('Estimado')} · Frankfurter${stale ? ' · ' + t('Tasa desactualizada') : ''}`}
        </Text>
      )}
      {mode === 'native' && <>
        {nativeMissing && <Text style={{ color: '#FFFFFF' }}>{t(overview.future ? 'El período aún no comienza.' : 'Saldo histórico no disponible')}</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {available.map(value => <Pill key={value} label={`${currencyFlag(value)} ${value}`}
            selected={value === source} onPress={() => setNativeCurrency(value)} />)}
        </View>
      </>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <Pill label={t('Por moneda')} selected={mode === 'native'} onPress={() => setMode('native')} />
        <Pill label={t('Balance total')} selected={mode === 'total'} onPress={() => setMode('total')} />
      </View>
    </LinearGradient>
  );
}
