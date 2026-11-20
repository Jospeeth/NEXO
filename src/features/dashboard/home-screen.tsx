import { useLanguage } from '../../shared/language/language';
import { ExchangeRateCard } from '../exchange/rate-card';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BalanceCarousel } from './balance-carousel';
import type { ExchangeQuote } from '../exchange/rate';
import { useRouter } from 'expo-router';
import { AccountCard } from '../../shared/ui/AccountCard';
import { TransactionRow } from '../../shared/ui/TransactionRow';
import { MonthYearPicker, Pill } from '../../shared/ui/date-controls';
import { localDay } from '../../shared/date/local-day';
import { displayBalance, type Currency } from '../accounts/account';
import { summarize } from './summary';
import { useLedger } from '../transactions/use-ledger';
import { radius, spacing, type, useTheme } from '../../shared/theme/theme';

export default function HomeScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { colors } = useTheme();
  const { ledger, failed, refresh } = useLedger();
  const { accounts = [], movements = [] } = ledger ?? {};
  const [selectedCurrency, setCurrency] = useState<Currency | null>(null);
  const [quoteState, setQuoteState] = useState<{ quote: ExchangeQuote | null; stale: boolean }>({ quote: null, stale: false });
  const [month, setMonth] = useState(() => new Date());
  const currencies = [...new Set(accounts.map(account => account.currency))];
  const currency = selectedCurrency && currencies.includes(selectedCurrency) ? selectedCurrency : currencies[0] ?? 'COP';
  const { available, expenses, income, expense, netCashFlow, openingBalance, closingBalance, isCurrentPeriod } =
    summarize(accounts, movements, localDay(month).slice(0, 7), currency, localDay());
  const money = (openingMinor: number) => displayBalance({ currency, openingMinor });


  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.page, paddingBottom: 112, gap: spacing.lg }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: type.title, fontWeight: '700' }}>{t("Resumen financiero")}</Text>
        {ledger && !failed && accounts.length > 0 ? (
          <BalanceCarousel accounts={accounts} available={available} currency={currency} onCurrencyChange={setCurrency}
            quote={quoteState.quote} stale={quoteState.stale} />
        ) : (
          <Text style={{ color: colors.secondaryText }}>
            {failed ? t("Saldo no disponible") : !ledger ? t("Cargando saldos…") : t("Sin cuentas")}
          </Text>
        )}
        {ledger && !failed && accounts.length > 0 && <ExchangeRateCard onQuoteChange={setQuoteState} />}
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: type.section, fontWeight: '700' }}>{t("Resumen del período")}</Text>
        <MonthYearPicker month={month} onChange={setMonth} />
        {failed && <Pill label={t("Reintentar")} onPress={() => { void refresh(); }} />}
        {ledger && !failed && accounts.length > 0 && <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: 12 }}>
          {openingBalance !== null && closingBalance !== null ? (
            <View style={{ backgroundColor: colors.surfaceSubtle, borderRadius: radius.card, padding: spacing.md, gap: spacing.md }}>
              <View style={{ gap: spacing.xs }}>
                <Text style={{ color: colors.secondaryText }}>{t("Saldo inicial")}</Text>
                <Text style={{ color: colors.text, fontSize: type.headline, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {money(openingBalance)}
                </Text>
              </View>
              <View style={{ gap: spacing.xs }}>
                <Text style={{ color: colors.secondaryText }}>
                  {isCurrentPeriod ? t("Saldo al cierre provisional") : t("Saldo de cierre")}
                </Text>
                <Text style={{ color: colors.primary, fontSize: type.headline, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {money(closingBalance)}
                </Text>
              </View>
            </View>
          ) : <Text style={{ color: colors.secondaryText }}>{t("Los saldos se muestran cuando comienza el mes.")}</Text>}
          {([[t("Ingresos"), income, colors.income], [t("Gastos"), expense, colors.expense],
            [t("Flujo neto"), netCashFlow, colors.text]] as const).map(([label, value, color]) =>
            <View key={label} style={{ gap: 4 }}>
              <Text style={{ color: colors.secondaryText }}>{label}</Text>
              <Text style={{ color, fontWeight: '700' }}>{money(value)}</Text>
              {label !== t("Flujo neto") && <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.surfaceSubtle }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: color, width: `${100 * value / Math.max(income, expense, 1)}%` }} />
              </View>}
            </View>)}
          {income === 0 && expense === 0 && <Text style={{ color: colors.secondaryText }}>{t("Sin movimientos en este mes.")}</Text>}
          {expenses.size > 0 && <Text style={{ color: colors.text, fontWeight: '700' }}>{t("Gastos por categoría")}</Text>}
          {[...expenses.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) =>
            <View key={label} style={{ gap: 4 }}>
              <Text style={{ color: colors.text }}>{label} · {money(value)}</Text>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.surfaceSubtle }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.primary, width: `${100 * value / Math.max(1, expense)}%` }} />
              </View>
            </View>)}
        </View>}
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: type.section, fontWeight: '700' }}>{t("Mis cuentas")}</Text>
        {ledger && !failed && !accounts.length && <Pill label={t("Crear primera cuenta")} onPress={() => router.push('/accounts')} />}
        {accounts.map(account => (
          <AccountCard key={account.id} account={account} variant="compact" style={{ width: '100%' }} />
        ))}
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: type.section, fontWeight: '700' }}>{t("Últimas transacciones")}</Text>
        {ledger && !movements.length && <Text style={{ color: colors.secondaryText }}>{t("Todavía no hay movimientos.")}</Text>}
        <View style={{ borderRadius: radius.card, overflow: 'hidden' }}>
          {[...movements].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.id - a.id)
            .slice(0, 4).map(item => (
              <TransactionRow key={item.id} movement={item}
                currency={accounts.find(account => account.id === item.accountId)?.currency} showDate />
            ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/movements')} style={{ minHeight: 44 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t("Ver movimientos ›")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
