import { CategoryExpenses } from './category-expenses';
import { useLanguage } from '../../shared/language/language';
import { useExchange } from '../exchange/use-exchange';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeHero } from './home-hero';
import { HomeFlow } from './home-flow';
import { homeMoney, homeOverview } from './home-overview';
import type { ConsolidatedCurrency } from './consolidated-balance';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BalanceCarousel } from './balance-carousel';
import { useRouter } from 'expo-router';
import { AccountCard } from '../../shared/ui/AccountCard';
import { TransactionRow } from '../../shared/ui/TransactionRow';
import { MonthYearPicker, Pill } from '../../shared/ui/date-controls';
import { localDay } from '../../shared/date/local-day';
import { useLedger } from '../transactions/use-ledger';
import { radius, spacing, subtleShadow, type, useTheme } from '../../shared/theme/theme';

export default function HomeScreen() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { ledger, failed, refresh } = useLedger();
  const { accounts = [], movements = [] } = ledger ?? {};
  const [displayCurrency, setDisplayCurrency] = useState<ConsolidatedCurrency | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { settings } = useExchange();
  const quote = settings?.quote ?? null;
  const [month, setMonth] = useState(() => new Date());
  const today = localDay();
  const period = localDay(month).slice(0, 7);
  const periodLabel = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(month);
  const heroCurrency = displayCurrency ?? settings?.currency ?? (accounts[0]?.currency === 'USD' ? 'USD' : 'COP');
  const overview = ledger && !failed ? homeOverview(accounts, movements, today, heroCurrency, quote, period) : undefined;
  const money = (value: Parameters<typeof homeMoney>[0]) => homeMoney(value, heroCurrency, locale);
  const recent = [...(overview?.periodMovements ?? [])]
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.id - a.id).slice(0, 4);
  const results = overview ? [overview.balance, overview.previous, overview.income, overview.expense] : [];
  const status = failed ? t('Saldo no disponible') : !overview ? t('Cargando saldos…')
    : overview.future ? t('El período aún no comienza.')
    : overview.balance.kind === 'historical-unavailable' ? t('Saldo histórico no disponible')
    : results.some(result => result.kind === 'unsupported-currency') ? t('Falta una tasa para otras monedas.')
      : results.some(result => result.kind === 'missing-rate') ? t('Configura la tasa USD/COP en Ajustes.')
        : results.some(result => result.kind === 'out-of-range') ? t('El saldo supera el rango que admite esta vista.')
          : overview.previous.kind === 'historical-unavailable' ? t('Cierre anterior no disponible') : undefined;
  const staleRate = settings?.stale && results.some(result => result.kind === 'available' && result.usedQuote);



  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: isDark ? colors.background : '#F3EDF5' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 120, gap: spacing.md }}>
        <HomeHero currency={heroCurrency} overview={overview} status={status} periodLabel={periodLabel} onCurrencyChange={setDisplayCurrency} />
        {failed && <Pill label={t('Reintentar')} onPress={() => { void refresh(); }} />}
        <View style={{ gap: spacing.xs }}>
          <SectionHeading title={t('Resumen financiero')} action={t(showDetails ? 'Ocultar detalles' : 'Detalles')}
            expanded={showDetails} onPress={() => setShowDetails(!showDetails)} />
          <MonthYearPicker month={month} onChange={setMonth} />
          <View style={[subtleShadow, { backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: spacing.md, gap: spacing.sm }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('Flujo financiero')}</Text>
              <Text style={{ color: colors.secondaryText, fontSize: type.caption }}>{periodLabel}{staleRate ? ' · ' + t('Tasa desactualizada') : ''}</Text>
            </View>
            <HomeFlow flow={overview?.flow ?? []} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs }}>
              {(['income', 'expense'] as const).map(key => (
                <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Ionicons name="ellipse" size={7} color={key === 'income' ? colors.income : colors.primary} />
                  <Text style={{ color: colors.text, fontSize: type.caption }}>
                    {t(key === 'income' ? 'Ingresos' : 'Gastos')} {homeMoney(overview?.[key], heroCurrency, locale)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        {showDetails && overview && <>
          <BalanceCarousel overview={overview} currency={heroCurrency}
            manual={settings?.manual} stale={settings?.stale ?? false}
            status={overview.balance.kind === 'available' ? undefined : status} />
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md }}>
            <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: '700' }}>
              {t('Resumen del período')} · {periodLabel}
            </Text>
            {([
              [t('Saldo inicial'), overview.previous],
              [t(overview.isCurrent ? 'Saldo al cierre provisional' : 'Saldo de cierre'), overview.balance],
              [t('Ingresos'), overview.income], [t('Gastos'), overview.expense], [t('Flujo neto'), overview.netCashFlow],
            ] as const).map(([label, value]) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text style={{ color: colors.secondaryText, flexShrink: 1 }}>{label}</Text>
                <Text style={{ color: colors.text, fontWeight: '700', flexShrink: 1 }}>
                  {value.kind === 'historical-unavailable' ? t('Saldo histórico no disponible') : money(value)}
                </Text>
              </View>
            ))}
          </View>
          <CategoryExpenses month={period} today={today} overview={overview} currency={heroCurrency} />
        </>}
        <SectionHeading title={t("Mis cuentas")} action={t("Ver todas")} onPress={() => router.push('/accounts')} />
        {ledger && !failed && !accounts.length && <Pill label={t("Crear primera cuenta")} onPress={() => router.push('/accounts')} />}
        {overview && !overview.future && overview.accountRows.map(({ account, closing, budgetSpent }) => (
          <AccountCard key={account.id} account={account} variant="compact" style={{ width: '100%' }}
            period={{ balanceMinor: closing, budgetSpent, historical: !overview.isCurrent }} />
        ))}
        {overview?.future && <Text style={{ color: colors.secondaryText }}>{t('El período aún no comienza.')}</Text>}
        <SectionHeading title={t("Transacciones recientes")} action={t("Ver todas")} onPress={() => router.push('/movements')} />
        {overview && !recent.length && <Text style={{ color: colors.secondaryText }}>{t("Sin movimientos en este mes.")}</Text>}
        <View style={{ borderRadius: radius.card, overflow: 'hidden' }}>
          {recent.map(item => (
              <TransactionRow key={item.id} movement={item}
                currency={accounts.find(account => account.id === item.accountId)?.currency} showDate />
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeading({ title, action, onPress, expanded }: {
  title: string; action: string; onPress: () => void; expanded?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: type.section, fontWeight: '700', flex: 1 }}>
        {title}
      </Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${title}, ${action}`}
        onPress={onPress} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 }}>
        <Text style={{ color: colors.primary, fontWeight: '600', flexShrink: 1 }}>{action}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-forward'} size={14} color={colors.secondaryText} />
      </Pressable>
    </View>
  );
}
