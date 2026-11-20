import { useLanguage } from '../language/language';
import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { spacing, useTheme } from '../theme/theme';
import { AmountDisplay } from './AmountDisplay';
import type { Movement } from '../../features/transactions/repository';

interface TransactionRowProps {
  movement: Movement;
  currency?: string;
  onPress?: () => void;
  showDate?: boolean;
}

export function TransactionRow({
  movement,
  currency = 'COP',
  onPress,
  showDate = false,
}: TransactionRowProps) {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();

  const emoji = movement.categoryEmoji || (movement.kind === 'income' ? '💰' : '📦');
  const title = movement.transferGroup ? t("Transferencia") : movement.categoryName || (movement.kind === 'income' ? t("Ingreso") : t("Sin categoría"));
  const subtitle = movement.note ? movement.note : (movement.kind === 'income' ? t("Ingreso registrado") : t("Gasto registrado"));

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.surfaceSubtle : colors.surface,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}, ${movement.kind === 'income' ? t('ingreso') : t('gasto')}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: movement.kind === 'income' ? colors.incomeLight : colors.lavender }]}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.amountContainer}>
        <AmountDisplay
          amountMinor={movement.amountMinor}
          currency={currency}
          kind={movement.kind}
          fontSize={15}
          fontWeight="600"
        />
        {showDate && (
          <Text style={[styles.dateText, { color: colors.tertiaryText }]}>
            {movement.transactionDate || new Date(movement.recordedAt).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  emojiText: {
    fontSize: 22,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
