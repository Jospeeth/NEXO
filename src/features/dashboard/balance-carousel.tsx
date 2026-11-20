import { useLanguage } from '../../shared/language/language';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pill } from '../../shared/ui/date-controls';
import { radius, spacing, type, useTheme } from '../../shared/theme/theme';
import { displayBalance, type Currency, type SavedAccount } from '../accounts/account';
import type { ExchangeQuote } from '../exchange/rate';
import { consolidatedBalance } from './consolidated-balance';

const tabs = ['Por moneda', 'Total en COP', 'Total en USD'] as const;
interface Props {
  accounts: SavedAccount[];
  available: number;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  quote: ExchangeQuote | null;
  stale: boolean;
}

export function BalanceCarousel({ accounts, available, currency, onCurrencyChange, quote, stale }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const currencies = [...new Set(accounts.map(account => account.currency))];
  const totals = (['COP', 'USD'] as const).map(target => ({ target, ...consolidatedBalance(accounts, target, quote) }));
  const amountStyle = { color: '#FFFFFF', fontSize: type.balance, fontWeight: '700' as const };

  return (
    <LinearGradient colors={[colors.heroGradientStart, colors.heroGradientEnd]}
      style={{ borderRadius: radius.hero, overflow: 'hidden' }}>
      <View onLayout={event => {
        const next = event.nativeEvent.layout.width;
        if (next !== width) {
          setWidth(next);
          setPage(0);
        }
      }}>
        {width > 0 && <ScrollView key={width} ref={scroll} horizontal pagingEnabled
          showsHorizontalScrollIndicator={false} directionalLockEnabled
          onMomentumScrollEnd={event => setPage(Math.max(0, Math.min(tabs.length - 1,
            Math.round(event.nativeEvent.contentOffset.x / width))))}>
          <View accessibilityElementsHidden={page !== 0}
            style={{ width, padding: spacing.xl, gap: spacing.md }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t("Saldo disponible por moneda")}</Text>
            <Text style={amountStyle}>{displayBalance({ currency, openingMinor: available })}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {currencies.map(value => <Pill key={value} label={value}
                selected={value === currency} onPress={() => onCurrencyChange(value)} />)}
            </View>
          </View>
          {totals.map((total, index) => (
            <View key={total.target} accessibilityElementsHidden={page !== index + 1}
              style={{ width, padding: spacing.xl, gap: spacing.md }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t("Saldo neto total en")} {total.target}</Text>
              {total.kind === 'available' ? <>
                <Text style={amountStyle}>{displayBalance({ currency: total.target, openingMinor: total.minor })}</Text>
                <Text style={{ color: '#FFFFFF' }}>
                  {total.usedQuote && quote
                    ? `${t("Estimado")} · APILayer${stale ? " · " + t("Tasa desactualizada") : ""}`
                    : t("Todas las cuentas")}
                </Text>
              </> : (
                <Text style={{ color: '#FFFFFF' }}>
                  {total.kind === 'missing-rate' ? t("Necesitas una cotización USD/COP para ver este total.")
                    : total.kind === 'unsupported-currency' ? t("El total requiere también una tasa para las cuentas en otras monedas.")
                    : t("El saldo supera el rango que admite esta vista.")}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
        {tabs.map((label, index) => (
          <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: page === index }}
            disabled={width <= 0} onPress={() => {
              scroll.current?.scrollTo({ x: index * width, animated: false });
              setPage(index);
            }}
            style={({ pressed }) => ({ flexGrow: 1, minHeight: 44, paddingHorizontal: spacing.sm,
              alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm,
              backgroundColor: page === index ? '#FFFFFF' : pressed ? '#FFFFFF33' : '#FFFFFF19' })}>
            <Text style={{ color: page === index ? colors.heroGradientEnd : '#FFFFFF', fontWeight: '600' }}>{t(label)}</Text>
          </Pressable>
        ))}
      </View>
    </LinearGradient>
  );
}
