import { useLanguage } from '../../shared/language/language';
import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exportAccounts } from '../accounts/export-accounts';
import { exportMovements } from '../transactions/export-movements';
import { radius, spacing, useTheme } from '../../shared/theme/theme';

const options = [
  { title: 'Exportar cuentas', empty: 'No hay cuentas para exportar.', run: exportAccounts },
  { title: 'Exportar movimientos', empty: 'No hay movimientos para exportar.', run: exportMovements },
] as const;

export function ExportSection() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const pending = useRef(false);
  const [exporting, setExporting] = useState<string | null>(null);

  async function run(option: typeof options[number]) {
    if (pending.current) return;
    pending.current = true;
    setExporting(option.title);
    try {
      if (!await option.run()) Alert.alert(t(option.empty));
    } catch {
      Alert.alert(t("No se pudo exportar el CSV"), t("Inténtalo de nuevo."));
    } finally {
      pending.current = false;
      setExporting(null);
    }
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text accessibilityRole="header" style={{ color: colors.secondaryText, fontSize: 13, fontWeight: '600' }}>{t("EXPORTACIÓN")}</Text>
      <View style={{ borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' }}>
        {options.map((option, index) => (
          <Pressable key={option.title} accessibilityRole="button" accessibilityLabel={t(option.title) + ' (CSV)'}
            accessibilityState={{ disabled: exporting !== null, busy: exporting === option.title }}
            disabled={exporting !== null} onPress={() => { void run(option); }}
            style={({ pressed }) => ({
              minHeight: 48, padding: spacing.md, flexDirection: 'row', alignItems: 'center',
              gap: spacing.sm, borderTopWidth: index ? 1 : 0, borderColor: colors.borderSubtle,
              backgroundColor: pressed ? colors.selected : colors.surface,
            })}>
            <Ionicons name="share-outline" size={19} color={colors.primary} />
            <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>
              {exporting === option.title ? t("Exportando…") : t(option.title)}
            </Text>
            <Text style={{ color: colors.secondaryText }}>CSV</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
