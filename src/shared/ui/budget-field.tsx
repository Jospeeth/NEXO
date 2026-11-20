import { useLanguage } from '../language/language';
import { Text, TextInput, View } from 'react-native';
import { currencies, type Currency } from '../../features/accounts/account';
import { radius, spacing, useTheme } from '../theme/theme';
import { Pill } from './date-controls';

interface Props {
  value: string;
  currency: Currency;
  onChange: (value: string) => void;
  onCurrencyChange?: (value: Currency) => void;
  income?: boolean;
  disabled: boolean;
}

export function BudgetField({ value, currency, onChange, onCurrencyChange, income, disabled }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const label = income ? t("Meta mensual de ingresos") : t("Presupuesto mensual");
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.secondaryText, fontWeight: '600' }}>{label} ({currency})</Text>
      <TextInput accessibilityLabel={label + ' ' + t('en') + ' ' + currency} keyboardType="decimal-pad"
        value={value} onChangeText={onChange} editable={!disabled} placeholder={t("Opcional")}
        placeholderTextColor={colors.secondaryText} style={{
          minHeight: 44, color: colors.text, backgroundColor: colors.surfaceSubtle, borderWidth: 1,
          borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md,
        }} />
      {onCurrencyChange && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {currencies.map(option => (
          <Pill key={option} label={option} selected={option === currency}
            onPress={() => { if (!disabled) onCurrencyChange(option); }} />
        ))}
      </View>}
    </View>
  );
}
