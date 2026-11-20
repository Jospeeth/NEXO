import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { loadCategories } from '../categories/repository';
import type { Category } from '../categories/category';
import { useLanguage } from '../../shared/language/language';
import { radius, spacing, type, useTheme } from '../../shared/theme/theme';
import type { ConsolidatedCurrency } from './consolidated-balance';
import { homeMoney, type HomeOverview } from './home-overview';
import { Pill } from '../../shared/ui/date-controls';

type Result = { month: string; attempt: number; categories: Category[] | null };

export function CategoryExpenses({ month, today, overview, currency }: {
  month: string; today: string; overview: HomeOverview; currency: ConsolidatedCurrency;
}) {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const [result, setResult] = useState<Result>();
  const [attempt, retry] = useState(0);
  const current = today.slice(0, 7);
  const future = month > current;

  useFocusEffect(useCallback(() => {
    if (future) return;
    let active = true;
    const [year = 0, monthNumber = 0] = month.split('-').map(Number);
    const start = month + '-01';
    const end = month === current ? today : `${month}-${new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()}`;
    void loadCategories(undefined, { start, end }).then(categories => {
      if (active) setResult({ month, attempt, categories });
    }).catch(() => {
      if (active) setResult({ month, attempt, categories: null });
    });
    return () => { active = false; };
  }, [attempt, current, future, month, today]));

  const available = result?.month === month && result.attempt === attempt ? result : undefined;
  const budgets = new Map((available?.categories ?? []).flatMap(category => {
    const { budgetCurrency, budgetMinor } = category;
    return category.kind !== 'income' && budgetCurrency && budgetMinor && budgetMinor > 0
      ? [[category.id, { ...category, budgetCurrency, budgetMinor }] as const] : [];
  }));
  const expenses = new Map(overview.categories.map(row => [row.id, row]));
  const ids = [...new Set([...expenses.keys(), ...budgets.keys()])].sort((a, b) => {
    const first = expenses.get(a)?.value;
    const second = expenses.get(b)?.value;
    return (second?.kind === 'available' ? second.minor : 0) - (first?.kind === 'available' ? first.minor : 0);
  });
  const total = overview.expense.kind === 'available' ? overview.expense.minor : 0;
  const percentages = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });

  if (future) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>{t('Gastos por categoría')}</Text>
      {available?.categories === null && <>
        <Text style={{ color: colors.secondaryText }}>{t('No se pudieron cargar los presupuestos.')}</Text>
        <Pill label={t('Reintentar')} onPress={() => retry(value => value + 1)} />
      </>}
      {available?.categories && ids.length === 0 && <Text style={{ color: colors.secondaryText }}>
        {t('Sin movimientos en este mes.')}
      </Text>}
      {budgets.size > 0 && month < current && <Text style={{ color: colors.secondaryText, fontSize: type.caption }}>
        {t('Se compara con los límites vigentes.')}
      </Text>}
      {ids.map((id, index) => {
        const budget = id === null ? undefined : budgets.get(id);
        const expense = expenses.get(id);
        const spent = budget?.monthActualMinor ?? 0;
        const expenseLabel = expense?.label ?? '';
        const separator = expenseLabel.indexOf(' ');
        const emoji = budget?.emoji || (separator > 0 ? expenseLabel.slice(0, separator) : '🏷️');
        const name = budget?.name ?? (separator > 0 ? expenseLabel.slice(separator + 1) : expenseLabel);
        const amount = homeMoney(expense?.value ?? { kind: 'available', minor: 0, usedQuote: false }, currency, locale);
        const progress = budget ? Math.max(spent / budget.budgetMinor, 0)
          : expense?.value.kind === 'available' && total > 0 ? Math.max(expense.value.minor / total, 0) : null;
        const tint = budget && spent > budget.budgetMinor ? colors.expense : colors.primary;
        const percent = progress === null ? undefined : percentages.format(progress);
        const budgetAmounts = budget ? new Intl.NumberFormat(locale, {
          style: 'currency', currency: budget.budgetCurrency, currencyDisplay: 'code',
        }) : null;
        return (
          <View key={id ?? 'uncategorized'} style={[styles.row, index > 0 && {
            borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
          }]}>
            <View style={[styles.badge, { backgroundColor: colors.lavender }]}
              accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <Text style={styles.emoji}>{emoji}</Text>
            </View>
            <View style={styles.content}>
              <View style={styles.line}>
                <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
                <Text style={[styles.amount, { color: colors.text }]}>{amount}</Text>
              </View>
              {progress !== null && <>
                <View style={[styles.track, { backgroundColor: colors.lavender }]}
                  accessibilityRole="progressbar" accessibilityLabel={name}
                  accessibilityValue={{ text: percent }}>
                  {progress > 0 && <View style={[styles.fill, {
                    width: `${Math.min(progress, 1) * 100}%`, backgroundColor: tint,
                  }]} />}
                </View>
                <View style={styles.meta}>
                  <Text style={[styles.caption, { color: budget ? tint : colors.secondaryText }]}>
                    {percent} {t(budget ? 'del presupuesto' : 'del gasto total')}
                  </Text>
                  {budget && budgetAmounts && <Text style={[styles.caption, { color: colors.secondaryText }]}>
                    {budgetAmounts.format(spent / 100)} / {budgetAmounts.format(budget.budgetMinor / 100)}
                  </Text>}
                </View>
              </>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs },
  heading: { fontSize: type.headline, fontWeight: '700', letterSpacing: -0.3, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  badge: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 17 },
  content: { flex: 1, gap: spacing.xs, minWidth: 0 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: type.body, fontWeight: '600', flexShrink: 1 },
  amount: { fontSize: type.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden', marginVertical: spacing.xs },
  fill: { height: '100%', borderRadius: radius.pill },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: spacing.sm, rowGap: spacing.xs },
  caption: { fontSize: type.caption, flexShrink: 1, fontVariant: ['tabular-nums'] },
});
