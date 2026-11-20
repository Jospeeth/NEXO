import { useLanguage } from '../language/language';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GlassView } from './GlassView';
import { radius, spacing, useTheme } from '../theme/theme';
import { localDay } from '../date/local-day';

export function Pill({ label, onPress, selected, accessibilityLabel }: {
  label: string; onPress: () => void; selected?: boolean; accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel}
    accessibilityState={selected === undefined ? undefined : { selected }} onPress={onPress}
    style={({ pressed }) => ({
      minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.card,
      backgroundColor: selected ? colors.primary : pressed ? colors.selected : colors.surfaceSubtle,
    })}>
    <Text style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}

export function MonthYearPicker({ month, onChange }: { month: Date; onChange: (date: Date) => void }) {
  const { t, locale } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();
  const monthName = (date: Date, length: 'long' | 'short') => new Intl.DateTimeFormat(locale, { month: length }).format(date);
  const change = (offset: number) => onChange(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  return (
    <GlassView>
      <View style={{ gap: 8, padding: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
          <Pill label="‹" accessibilityLabel={t("Mes anterior")} onPress={() => change(-1)} />
          <Pill label={`${monthName(month, 'long')} ${month.getFullYear()} ▾`} onPress={() => setExpanded(!expanded)} />
          <Pill label="›" accessibilityLabel={t("Mes siguiente")} onPress={() => change(1)} />
        </View>
        {expanded && <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill label="−" accessibilityLabel={t("Año anterior")} onPress={() => change(-12)} />
            <Text style={{ color: colors.text, fontWeight: '700' }}>{month.getFullYear()}</Text>
            <Pill label="+" accessibilityLabel={t("Año siguiente")} onPress={() => change(12)} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Array.from({ length: 12 }, (_, index) => new Date(month.getFullYear(), index, 1)).map(date =>
              <Pill key={date.getMonth()} label={monthName(date, 'short')} selected={month.getMonth() === date.getMonth()}
                onPress={() => { onChange(date); setExpanded(false); }} />)}
          </View>
        </>}
      </View>
    </GlassView>
  );
}

export function DatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const date = new Date(value + 'T12:00:00');
  return <View style={{ gap: 8 }}>
    <Pill label={date.toLocaleDateString(locale)} accessibilityLabel={`${t("Fecha")}, ${value}`} onPress={() => setOpen(!open)} />
    {open && <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.sm }}>
      <DateTimePicker value={date} mode="date" display="inline" locale={locale} onValueChange={(_, selected) => onChange(localDay(selected))} />
      <Pill label={t("Listo")} onPress={() => setOpen(false)} />
    </View>}
    {value > localDay() && <Text style={{ color: colors.secondaryText }}>{t("Pendiente hasta la fecha seleccionada.")}</Text>}
  </View>;
}
