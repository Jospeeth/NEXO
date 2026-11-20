import { useLanguage } from '../../shared/language/language';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextInput, View } from 'react-native';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { accountColorGradient, normalizeAccountColor } from './account-color';

export function AccountColorField({ value, onChange, disabled }: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const custom = normalizeAccountColor(value);
  const previewColors = custom ? accountColorGradient(custom) : [colors.cardGradientStart, colors.cardGradientEnd] as const;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.secondaryText, fontWeight: '600' }}>{t("Color de la tarjeta (HEX)")}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <TextInput accessibilityLabel={t("Color de la tarjeta en formato HEX")} value={value} onChangeText={onChange}
          editable={!disabled} autoCapitalize="characters" autoCorrect={false}
          placeholder="#6D28D9" placeholderTextColor={colors.secondaryText}
          style={{ flex: 1, minHeight: 46, backgroundColor: colors.surfaceSubtle, borderColor: colors.border,
            borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.md, color: colors.text }} />
        <LinearGradient colors={previewColors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={{ minWidth: 46, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm }}>
          <Text accessibilityLabel={t("Vista previa del degradado")} style={{ color: '#FFFFFF', fontWeight: '700' }}>Aa</Text>
        </LinearGradient>
      </View>
      <Text style={{ color: value.trim() && !custom ? colors.expense : colors.secondaryText }}>
        {value.trim() && !custom ? t("Usa seis dígitos HEX, por ejemplo #6D28D9.") : t("Déjalo vacío para usar el morado de NEXO.")}
      </Text>
    </View>
  );
}
