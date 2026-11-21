import { InstitutionMark } from './institution-mark';
import { MetallicSheen } from './metallic-sheen';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../../shared/language/language';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { DatePicker, Pill } from '../../shared/ui/date-controls';
import { CurrencyPicker } from '../exchange/currency-picker';
import type { AccountKind } from './account';
import type { CustomDraft } from './card-customization-draft';
import { bankGroups, creditProduct, creditProducts, institutionSearch } from './institutions';
import { metallicFinishes, feeMonths, type Finish, type FeeFrequency } from './card-profile';

export const feeLabels: Record<FeeFrequency, string> = {
  monthly: 'Mensual', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual',
};

export function CardCustomization({ value, onChange, name, currency, kind, disabled, recent }: {
  value: CustomDraft; onChange: (value: CustomDraft) => void; name: string; currency: string;
  kind: AccountKind; disabled: boolean; recent: string[];
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [section, setSection] = useState<'bank' | 'appearance' | 'settings' | null>(null);
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState(false);
  const set = <K extends keyof CustomDraft,>(key: K, item: CustomDraft[K]) => onChange({ ...value, [key]: item });
  const field = (label: string, key: 'institution' | 'lastFour' | 'limit' | 'interest' | 'installments' | 'feeAmount', maxLength: number, numeric = false) =>
    <TextInput accessibilityLabel={t(label)} placeholder={t(label)} placeholderTextColor={colors.secondaryText}
      keyboardType={numeric ? 'decimal-pad' : 'default'} value={value[key]} onChangeText={text => set(key, text)}
      maxLength={maxLength} editable={!disabled}
      style={{ minHeight: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceSubtle, color: colors.text, paddingHorizontal: spacing.md }} />;
  const groups = [['Recientes', recent.filter(name => kind === 'credit_card' || !creditProduct(name))],
    ...Object.entries(bankGroups), ...(kind === 'credit_card' ? [['Productos de crédito', Object.keys(creditProducts)] as const] : [])] as const;
  const selected = value.finish ? metallicFinishes[value.finish] : metallicFinishes.royal;
  const titles = { bank: 'Entidad financiera', appearance: 'Apariencia de la tarjeta', settings: 'Configuración de crédito' } as const;

  return (
    <View style={{ gap: spacing.sm }}>
      {(['bank', 'appearance', ...(kind === 'credit_card' ? ['settings'] as const : [])] as const).map(key => (
        <View key={key} style={{ gap: spacing.sm }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: section === key }}
            disabled={disabled} onPress={() => setSection(section === key ? null : key)}
            style={{ minHeight: 44, borderRadius: radius.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surfaceSubtle,
              flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{t(titles[key])}</Text>
            {key === 'bank' && !!value.institution && <>
              <InstitutionMark name={value.institution} size={25} />
              <Text style={{ color: colors.secondaryText, flexShrink: 1 }}>{value.institution}</Text>
            </>}
            <Ionicons name={section === key ? 'chevron-up' : 'chevron-forward'} color={colors.secondaryText} size={15} />
          </Pressable>
          {section === key && key === 'bank' && <>
            <TextInput accessibilityLabel={t('Buscar entidad')} placeholder={t('Buscar entidad')} value={search} onChangeText={setSearch}
              placeholderTextColor={colors.secondaryText} style={{ minHeight: 44, color: colors.text, paddingHorizontal: spacing.md,
                borderRadius: radius.sm, backgroundColor: colors.surfaceSubtle }} />
            {groups.map(([label, names]) => {
              const results = names.filter(name => institutionSearch(name).includes(institutionSearch(search)));
              return results.length > 0 && <View key={label} style={{ gap: spacing.xs }}>
                <Text style={{ color: colors.secondaryText, fontWeight: '600' }}>{t(label)}</Text>
                {results.map(name => <Pressable key={name} accessibilityRole="button"
                  onPress={() => { set('institution', name); setSection(null); setSearch(''); }}
                  style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <InstitutionMark name={name} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text }}>{name}</Text>
                    {creditProduct(name) && <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                      {t('Emisor')} · {creditProduct(name)?.issuer}
                    </Text>}
                  </View>
                  {name === value.institution && <Ionicons name="checkmark" color={colors.primary} size={16} />}
                </Pressable>)}
              </View>;
            })}
            <Pill label={t('Otra entidad')} selected={custom} onPress={() => setCustom(!custom)} />
            {custom && field('Nombre de la entidad', 'institution', 80)}
            {!!value.institution && <Pill label={t('Quitar entidad')} onPress={() => set('institution', '')} />}
          </>}
          {section === key && key === 'appearance' && <>
            <LinearGradient colors={[selected[2], selected[3], selected[2]]}
              style={{ minHeight: 108, borderRadius: radius.card, padding: spacing.md, gap: spacing.sm, overflow: 'hidden' }}>
              <MetallicSheen />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {!!value.institution && <InstitutionMark name={value.institution} />}
                <Text style={{ color: '#FFF', fontWeight: '600', flexShrink: 1 }}>{value.institution || t('Sin entidad')}</Text>
              </View>
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 20 }}>{name || t('Nombre de la cuenta')}</Text>
              <Text style={{ color: '#FFF' }}>{value.lastFour ? `•••• ${value.lastFour}    ` : ''}{currency}</Text>
            </LinearGradient>
            {field('Últimos cuatro dígitos', 'lastFour', 4, true)}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {(Object.entries(metallicFinishes) as [Finish, typeof metallicFinishes[Finish]][]).map(([id, finish]) =>
                <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: value.finish === id }}
                  onPress={() => set('finish', id)} style={{ width: '48%', gap: spacing.xs, padding: spacing.xs }}>
                  <LinearGradient colors={[finish[2], finish[1], finish[2]]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
                    style={{ height: 45, borderRadius: radius.sm, overflow: 'hidden', borderWidth: value.finish === id ? 2 : 0,
                      borderColor: colors.primary, alignItems: 'flex-end', padding: spacing.xs }}>
                    <MetallicSheen />
                    {value.finish === id && <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
                  </LinearGradient>
                  <Text style={{ color: colors.text, fontSize: 12 }}>{finish[0]}</Text>
                </Pressable>)}
            </View>
            {value.finish && <Pill label={t('Quitar acabado metalizado')} onPress={() => set('finish', undefined)} />}
          </>}
          {section === key && key === 'settings' && kind === 'credit_card' && <>
            {field('Cupo de crédito', 'limit', 16, true)}
            {field('Interés mensual (%)', 'interest', 8, true)}
            {field('Cuotas preferidas', 'installments', 3, true)}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{t('Cuota de manejo')}</Text>
              <Switch accessibilityLabel={t('Cuota de manejo')} value={value.feeEnabled} onValueChange={enabled => set('feeEnabled', enabled)} />
            </View>
            {value.feeEnabled && <>
              {field('Importe de la cuota', 'feeAmount', 16, true)}
              <CurrencyPicker label={t('Moneda del cobro')} value={value.feeCurrency || currency}
                onChange={code => set('feeCurrency', code)} disabled={disabled} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {(Object.keys(feeMonths) as FeeFrequency[]).map(item =>
                  <Pill key={item} label={t(feeLabels[item])} selected={value.frequency === item} onPress={() => set('frequency', item)} />)}
              </View>
              <Text style={{ color: colors.secondaryText }}>{t('Fecha de inicio')}</Text>
              <DatePicker value={value.start} onChange={date => set('start', date)} />
              <Text style={{ color: colors.secondaryText }}>{t('Próximo cobro')}</Text>
              <DatePicker value={value.next} onChange={date => set('next', date)} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text }}>{t('Exoneración temporal')}</Text>
                <Switch accessibilityLabel={t('Exoneración temporal')} value={value.waived} onValueChange={waived => set('waived', waived)} />
              </View>
              {value.waived && <>
                <Text style={{ color: colors.secondaryText }}>{t('Fin de la exoneración')}</Text>
                <DatePicker value={value.waiverUntil} onChange={date => set('waiverUntil', date)} />
              </>}
            </>}
          </>}
        </View>
      ))}
    </View>
  );
}
