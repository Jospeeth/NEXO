import { useLanguage } from '../language/language';
import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../theme/theme';
import type { Currency } from '../../features/accounts/account';

interface AmountDisplayProps {
  amountMinor: number;
  currency?: Currency | string;
  kind?: 'income' | 'expense' | 'neutral';
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
  showSign?: boolean;
  style?: StyleProp<TextStyle>;
}

export function AmountDisplay({
  amountMinor,
  currency = 'COP',
  kind = 'neutral',
  fontSize = 16,
  fontWeight = '600',
  showSign = true,
  style,
}: AmountDisplayProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const formattedValue = new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-CO', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: currency === 'COP' && amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: currency === 'COP' && amountMinor % 100 === 0 ? 0 : 2,
  }).format(Math.abs(amountMinor) / 100);

  let sign = '';
  let color = colors.text;

  if (kind === 'income') {
    sign = showSign ? '+' : '';
    color = colors.income;
  } else if (kind === 'expense') {
    sign = showSign ? '−' : '';
    color = colors.expense;
  } else if (showSign && amountMinor < 0) {
    sign = '−';
  }

  const textRepresentation = `${sign}${formattedValue}`;
  const accessibleLabel = `${kind === 'income' ? t("Ingreso de ") : kind === 'expense' ? t("Gasto de ") : ''}${formattedValue}`;

  return (
    <Text
      accessibilityLabel={accessibleLabel}
      style={[
        styles.amount,
        {
          color,
          fontSize,
          fontWeight,
        },
        style,
      ]}
    >
      {textRepresentation}
    </Text>
  );
}

const styles = StyleSheet.create({
  amount: {
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
});
