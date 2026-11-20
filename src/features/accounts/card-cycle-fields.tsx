import { Text, TextInput, View } from 'react-native';
import { useLanguage } from '../../shared/language/language';
import { radius, spacing, useTheme } from '../../shared/theme/theme';

export type CardCycleDraft = { statement: string; payment: string };

export function CardCycleFields({ value, onChange, disabled }: {
  value: CardCycleDraft;
  onChange: (value: CardCycleDraft) => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const fields = [['statement', 'Día de corte'], ['payment', 'Día de pago']] as const;
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {fields.map(([field, label]) => (
          <View key={field} style={{ flex: 1, gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{t(label)}</Text>
            <TextInput accessibilityLabel={t(label)} keyboardType="number-pad"
              placeholder="1–31" placeholderTextColor={colors.secondaryText}
              editable={!disabled} maxLength={2} value={value[field]}
              onChangeText={text => onChange({ ...value, [field]: text })}
              style={{ color: colors.text, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.sm,
                borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSubtle }} />
          </View>
        ))}
      </View>
      <Text style={{ color: colors.secondaryText }}>
        {t('Días mensuales opcionales. Si el mes es más corto, se usa su último día.')}
      </Text>
    </View>
  );
}
