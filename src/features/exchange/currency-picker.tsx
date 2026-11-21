import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../shared/language/language';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { Pill } from '../../shared/ui/date-controls';
import { currencyFlag, defaultCurrencies } from './rate';
import { readCatalog } from './repository';

export function CurrencyPicker({ value, onChange, excluded = [], label, disabled }: {
  value?: string; onChange: (code: string) => void; excluded?: string[]; label: string; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [catalog, setCatalog] = useState(defaultCurrencies);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    void readCatalog().then(result => {
      if (active) { setCatalog(result.value); setOffline(result.offline); }
    });
    return () => { active = false; };
  }, [open]);
  const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames([locale], { type: 'currency' }) : null;
  const query = term.trim().toLocaleLowerCase(locale);
  const matches = catalog.filter(item => !excluded.includes(item.iso_code) &&
    [item.iso_code, item.name, names?.of(item.iso_code) ?? ''].some(text => text.toLocaleLowerCase(locale).includes(query)));

  return <View style={{ gap: spacing.xs }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      onPress={() => { setOpen(!open); setTerm(''); }}
      style={({ pressed }) => ({ minHeight: 46, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center',
        gap: spacing.sm, backgroundColor: pressed ? colors.selected : colors.surfaceSubtle, borderRadius: radius.sm })}>
      <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{label}</Text>
      {!!value && <Text style={{ color: colors.secondaryText }}>{currencyFlag(value)} {value}</Text>}
      <Ionicons name={open ? 'chevron-up' : 'chevron-forward'} size={15} color={colors.secondaryText} />
    </Pressable>
    {open && <>
      <TextInput accessibilityLabel={t('Buscar por código o nombre')} placeholder={t('Buscar por código o nombre')}
        autoCorrect={false} value={term} onChangeText={setTerm} placeholderTextColor={colors.secondaryText}
        style={{ minHeight: 44, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.surfaceSubtle, borderRadius: radius.sm }} />
      {offline && <Text style={{ color: colors.secondaryText }}>{t('Catálogo sin conexión')}</Text>}
      {matches.slice(0, 30).map(({ iso_code, name }) => (
        <Pressable key={iso_code} accessibilityRole="button" accessibilityState={{ selected: iso_code === value }}
          onPress={() => { onChange(iso_code); setOpen(false); }}
          style={{ minHeight: 44, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingHorizontal: spacing.sm,
            borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{currencyFlag(iso_code)} {iso_code}</Text>
          <Text style={{ color: colors.secondaryText, flex: 1 }}>{names?.of(iso_code) ?? name}</Text>
          {iso_code === value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
        </Pressable>
      ))}
      {!matches.length && <Text style={{ color: colors.secondaryText }}>{t('Sin monedas coincidentes.')}</Text>}
      {matches.length > 30 && <Text style={{ color: colors.secondaryText }}>{t('Escribe el código o nombre para ver más resultados.')}</Text>}
      <Pill label={t('Cerrar')} onPress={() => setOpen(false)} />
    </>}
  </View>;
}
