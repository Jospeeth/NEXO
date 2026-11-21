import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../shared/language/language';
import { elevation, radius, spacing, useTheme } from '../../shared/theme/theme';
import { GlassBackdrop } from '../../shared/ui/GlassView';

import { currencyFlag } from '../exchange/rate';
import type { ConsolidatedCurrency } from './consolidated-balance';
import { homeMoney, type HomeOverview } from './home-overview';

interface Props {
  currency: ConsolidatedCurrency;
  currencies: ConsolidatedCurrency[];
  overview?: HomeOverview;
  status?: string;
  periodLabel: string;
  onCurrencyChange: (currency: ConsolidatedCurrency) => void;
}

export function HomeHero({ currency, currencies, overview, status, periodLabel, onCurrencyChange }: Props) {
  const { t, locale } = useLanguage();
  const { colors, isDark } = useTheme();
  const money = (key: 'balance' | 'previous' | 'income' | 'expense') => homeMoney(overview?.[key], currency, locale);
  const change = overview?.trend ?? null;
  const trend = change === null ? null
    : new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(change);
  const trendColor = change === null || change === 0 ? '#FFFFFF' : change > 0 ? '#AAFFC2' : '#FFBDD0';
  const tileBackground = isDark ? colors.surface : '#FAF6FA';

  return (
    <View style={styles.hero}>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{t('Buenos días 👋')}</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{t('Así va tu plan financiero')}</Text>
        </View>
        <Image source={require('../../../assets/home/avatar.png')} style={styles.avatar}
          accessible accessibilityLabel={t('Avatar de ejemplo')} />
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel={t('Moneda de visualización')}
        style={[styles.currencyGroup, { borderColor: colors.border }]}>
        <GlassBackdrop borderRadius={radius.pill} />
        {currencies.map(value => {
          const selected = currency === value;
          return (
            <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: selected }}
              accessibilityLabel={value} hitSlop={{ top: 6, bottom: 6 }}
              onPress={() => onCurrencyChange(value)}
              style={({ pressed }) => [styles.currencyButton, {
                backgroundColor: selected || pressed ? colors.glassBackground : 'transparent',
              }]}>
              <Text style={styles.flag}>{currencyFlag(value)}</Text>
              <Text style={{ color: selected ? colors.text : colors.secondaryText, fontWeight: selected ? '700' : '600' }}>{value}</Text>
              {selected && <Ionicons name="chevron-down" size={12} color={colors.secondaryText} />}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.balanceShadow, elevation]}>
        <LinearGradient colors={isDark ? ['#43256D', '#623599'] : ['#573A92', '#724DBC']}
          start={{ x: 0, y: 0.46 }} end={{ x: 1, y: 0.54 }} style={styles.balance}>
          <Image accessible={false} source={require('../../../assets/home/balance-waves.png')}
            resizeMode="stretch" style={styles.waves} />
          <View style={styles.balanceHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('Información del balance')} hitSlop={10}
              onPress={() => Alert.alert(t('Balance total'), status ?? t('Saldos convertidos con las tasas de referencia de Frankfurter.'))}
              style={styles.balanceLabel}>
              <Text style={styles.balanceLabelText}>{t('Balance total')}</Text>
              <Ionicons name="information-circle-outline" size={15} color="#FFFFFF" />
            </Pressable>
            {trend !== null && <View style={styles.trend}>
              <Ionicons name={change !== null && change < 0 ? 'trending-down' : 'trending-up'} size={13} color={trendColor} />
              <Text style={[styles.trendText, { color: trendColor }]}>{trend.replace(/\s/g, '')}</Text>
            </View>}
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.66}
            accessibilityLabel={`${money('balance')} ${currency}`} style={styles.amount}>
            {money('balance')} <Text style={styles.unit}>{currency}</Text>
          </Text>
          <Text style={styles.previous}>{status ?? `${t('vs. mes anterior')} (${money('previous')})`}</Text>
        </LinearGradient>
      </View>

      <View style={styles.tiles}>
        {(['income', 'expense'] as const).map(value => {
          const income = value === 'income';
          return (
            <View key={value} style={[styles.tile, elevation, { backgroundColor: tileBackground }]}>
              <View style={[styles.arrow, { backgroundColor: income ? colors.incomeLight : colors.expenseLight }]}>
                <Ionicons name={income ? 'arrow-down' : 'arrow-up'} size={17}
                  color={isDark ? income ? colors.income : colors.expense : income ? '#00883D' : '#D81150'} />
              </View>
              <View style={styles.tileCopy}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>{t(income ? 'Ingresos' : 'Gastos')}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}
                  style={[styles.tileAmount, { color: colors.text }]}>{money(value)}</Text>
                <Text style={[styles.tilePeriod, { color: colors.secondaryText }]}>{periodLabel}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs, gap: spacing.md },
  greeting: { flex: 1 },
  title: { fontSize: 25, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, fontWeight: '500', marginTop: 1 },
  avatar: { width: 43, height: 43, borderRadius: 22 },
  currencyGroup: { alignSelf: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', borderRadius: radius.pill, borderWidth: 1, marginLeft: spacing.xs, marginTop: 3 },
  currencyButton: { minHeight: 32, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, borderRadius: radius.pill },
  flag: { fontSize: 16 },
  balanceShadow: { borderRadius: radius.cardLg },
  balance: { minHeight: 107, borderRadius: radius.cardLg, paddingHorizontal: spacing.lg, paddingVertical: 11, overflow: 'hidden', justifyContent: 'center', gap: 2 },
  waves: { position: 'absolute', width: '55%', height: '62%', right: 0, bottom: 0 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs },
  balanceLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  balanceLabelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#D4FFEA35', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  trendText: { fontSize: 13, fontWeight: '700' },
  amount: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  unit: { color: '#E4D8FD', fontSize: 20, fontWeight: '600' },
  previous: { color: '#E1D4F7', fontSize: 12, marginTop: 3 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderRadius: radius.cardLg, padding: 10, minHeight: 71 },
  arrow: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tileCopy: { flex: 1 },
  tileTitle: { fontSize: 13, fontWeight: '600' },
  tileAmount: { fontSize: 17, fontWeight: '800', letterSpacing: -0.35, fontVariant: ['tabular-nums'] },
  tilePeriod: { fontSize: 11, marginTop: 1 },
});
