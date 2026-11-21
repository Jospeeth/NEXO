import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { readCurrencyPreferences } from '../exchange/repository';
import { useLanguage } from '../../shared/language/language';
import { useAppearanceSettings } from '../../shared/theme/appearance';
import { radius, spacing, type, useTheme } from '../../shared/theme/theme';

export const settingsSections = {
  appearance: 'Apariencia', language: 'Idioma', currencies: 'Monedas',
  categories: 'Categorías', data: 'Importar y exportar', security: 'Seguridad y privacidad',
} as const;
export type SettingsSection = keyof typeof settingsSections;

export default function SettingsMenu() {
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const { preference } = useAppearanceSettings();
  const router = useRouter();
  const [currencySummary, setCurrencySummary] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    void readCurrencyPreferences().then(({ currency, preferred }) => {
      if (active) setCurrencySummary(currency + (preferred.length ? ` + ${preferred.length}` : ''));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []));

  const groups = [
    { title: 'Preferencias', rows: [
      ['appearance', 'contrast-outline', t({ auto: 'Sistema', light: 'Claro', dark: 'Oscuro' }[preference])],
      ['language', 'language-outline', language === 'en' ? 'English' : 'Español'],
      ['currencies', 'cash-outline', currencySummary],
    ] },
    { title: 'Personalización', rows: [['categories', 'pricetags-outline']] },
    { title: 'Datos', rows: [['data', 'swap-vertical-outline'], ['security', 'lock-closed-outline']] },
  ] as const;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.page, paddingBottom: 120, gap: spacing.lg }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: type.title, fontWeight: '800' }}>{t('Ajustes')}</Text>
        {groups.map(group => <View key={group.title} style={{ gap: spacing.xs }}>
          <Text accessibilityRole="header" style={{ color: colors.secondaryText, fontSize: type.caption, marginLeft: spacing.sm }}>{t(group.title)}</Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' }}>
            {group.rows.map(([section, icon, ...values], index) => (
              <Pressable key={section} accessibilityRole="button"
                onPress={() => router.push({ pathname: '/preferences/[section]', params: { section } })}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 49,
                  paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                  borderTopColor: colors.borderSubtle, borderTopWidth: index ? StyleSheet.hairlineWidth : 0,
                  backgroundColor: pressed ? colors.selected : colors.surface })}>
                <Ionicons name={icon} size={20} color={colors.primary} />
                <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{t(settingsSections[section])}</Text>
                {!!values[0] && <Text style={{ color: colors.secondaryText }}>{values[0]}</Text>}
                <Ionicons name="chevron-forward" size={14} color={colors.secondaryText} />
              </Pressable>
            ))}
          </View>
        </View>)}
      </ScrollView>
    </SafeAreaView>
  );
}
