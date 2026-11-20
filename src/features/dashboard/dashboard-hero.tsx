import { useLanguage } from '../../shared/language/language';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cardShadow, radius, spacing, useTheme } from '../../shared/theme/theme';
import { AmountDisplay } from '../../shared/ui/AmountDisplay';

interface DashboardHeroProps {
  totalBalanceMinor: number;
  monthlyIncomeMinor: number;
  monthlyExpenseMinor: number;
  currency?: string;
}

export function DashboardHero({
  totalBalanceMinor,
  monthlyIncomeMinor,
  monthlyExpenseMinor,
  currency = 'COP',
}: DashboardHeroProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.outerContainer, cardShadow]}>
      <LinearGradient
        colors={[colors.heroGradientStart, colors.heroGradientEnd]}
        start={{ x: 0.1, y: 0.0 }}
        end={{ x: 0.9, y: 1.0 }}
        style={[
          styles.gradientBox,
          {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.28)',
          },
        ]}
      >
        {/* Header line */}
        <View style={styles.headerLine}>
          <Text style={styles.headerSubtitle}>{t("BALANCE GENERAL")}</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t("Al día")}</Text>
          </View>
        </View>

        {/* Main Hero Balance */}
        <View style={styles.balanceArea}>
          <Text
            style={styles.heroAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency,
              currencyDisplay: 'code',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalBalanceMinor / 100)}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Income / Expense summary row */}
        <View style={styles.summaryRow}>
          {/* Income block */}
          <View style={styles.metricBlock}>
            <View style={styles.metricLabelRow}>
              <View style={[styles.arrowBadge, { backgroundColor: 'rgba(34, 197, 94, 0.25)' }]}>
                <Text style={styles.arrowIcon}>↑</Text>
              </View>
              <Text style={styles.metricLabel}>{t("Ingresos del mes")}</Text>
            </View>
            <AmountDisplay
              amountMinor={monthlyIncomeMinor}
              currency={currency}
              kind="income"
              fontSize={18}
              fontWeight="700"
              style={styles.incomeAmount}
            />
          </View>

          {/* Vertical separator */}
          <View style={styles.verticalSeparator} />

          {/* Expense block */}
          <View style={styles.metricBlock}>
            <View style={styles.metricLabelRow}>
              <View style={[styles.arrowBadge, { backgroundColor: 'rgba(239, 68, 68, 0.25)' }]}>
                <Text style={styles.arrowIcon}>↓</Text>
              </View>
              <Text style={styles.metricLabel}>{t("Gastos del mes")}</Text>
            </View>
            <AmountDisplay
              amountMinor={monthlyExpenseMinor}
              currency={currency}
              kind="expense"
              fontSize={18}
              fontWeight="700"
              style={styles.expenseAmount}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: radius.hero,
  },
  gradientBox: {
    padding: spacing.xl,
    borderRadius: radius.hero,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  liveText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: '600',
  },
  balanceArea: {
    marginVertical: spacing.sm,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricBlock: {
    flex: 1,
    gap: 4,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  incomeAmount: {
    color: '#86EFAC',
  },
  expenseAmount: {
    color: '#FCA5A5',
  },
  verticalSeparator: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: spacing.md,
  },
});
