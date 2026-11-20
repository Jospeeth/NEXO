import { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../shared/language/language';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { DatePicker, Pill } from '../../shared/ui/date-controls';
import { GlassView } from '../../shared/ui/GlassView';
import { displayBalance, type Currency } from '../accounts/account';
import { fixedPaymentPlan, paymentDate } from './plan';

interface Props {
  principal: number;
  currency: Currency;
  purchaseDate: string;
  firstDueDate?: string;
  onClose: () => void;
  example?: boolean;
  accountName?: string;
}

export function InstallmentPreview({ principal, currency, purchaseDate, firstDueDate, onClose, example, accountName }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [count, setCount] = useState(example ? '6' : '1');
  const [custom, setCustom] = useState(false);
  const [rate, setRate] = useState(example ? '2' : '0');
  const [annual, setAnnual] = useState(false);
  const [free, setFree] = useState(false);
  const [showPlan, setShowPlan] = useState(example ?? false);
  const [showCard, setShowCard] = useState(example ?? false);
  const [due, setDue] = useState(() => firstDueDate ?? paymentDate(purchaseDate, 1));
  const number = /^\d+$/.test(count.trim()) ? Number(count) : NaN;
  const raw = rate.trim().replace(',', '.');
  const percent = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) / 100 : NaN;
  const monthly = free ? 0 : annual ? Math.expm1(Math.log1p(percent) / 12) : percent;
  const plan = due > purchaseDate ? fixedPaymentPlan(principal, number, monthly, due) : null;
  const money = (openingMinor: number) => displayBalance({ openingMinor, currency });
  const input = { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, color: colors.text };
  const wrap = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm };
  const normal = { color: colors.text };
  const muted = { color: colors.secondaryText };
  const heading = { ...normal, fontSize: 22, fontWeight: '700' as const };

  function changePeriod(nextAnnual: boolean) {
    if (nextAnnual === annual) return;
    if (Number.isFinite(monthly) && !free) {
      const converted = nextAnnual ? Math.expm1(Math.log1p(monthly) * 12) : monthly;
      setRate(String(Number((converted * 100).toFixed(8))));
    }
    setAnnual(nextAnnual);
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <GlassView style={{ padding: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text accessibilityRole="header" style={heading}>{t(showCard ? 'Detalle de tarjeta' : showPlan ? 'Plan de pagos' : 'Detalles de cuotas')}</Text>
            <Pill label={t('Cerrar')} onPress={onClose} />
          </GlassView>
          <Text style={muted}>{t(example ? 'Ejemplo con datos simulados' : 'Vista previa · El plan de cuotas no se guarda')}</Text>
          {showCard ? <>
            <View style={{ backgroundColor: colors.heroGradientEnd, padding: spacing.lg, borderRadius: radius.card, gap: spacing.sm }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{accountName}</Text>
              <Text style={{ color: '#fff' }}>{t('Cupo disponible')} · {money(380000000)}</Text>
              <Text style={{ color: '#fff' }}>{t('Cupo total')} · {money(500000000)}</Text>
              <Text style={{ color: '#fff' }}>{t('Saldo utilizado')} · {money(120000000)}</Text>
            </View>
            <Text style={normal}>{t('Fecha de corte')} · {due.slice(0, 7)}-10</Text>
            <Text style={normal}>{t('Fecha límite de pago')} · {due}</Text>
            <Text style={normal}>{t('Próximo pago estimado')} · {money(plan?.estimated ?? 0)}</Text>
            <Text accessibilityRole="header" style={heading}>{t('Compras activas')}</Text>
            <Pill label={`${t('Computador')} · ${count} ${t('cuotas proyectadas')}`}
              onPress={() => { setShowCard(false); setShowPlan(true); }} />
            <Text style={muted}>{t('Sin pagos registrados en este ejemplo.')}</Text>
          </> : <>
            <Text style={normal}>{t('Importe de la compra')} · {money(principal)}</Text>
            {!showPlan && <>
              <Text style={normal}>{t('Número de cuotas')}</Text>
              <View style={wrap}>
                {['1', '3', '6', '12'].map(option => <Pill key={option} label={option} selected={!custom && count === option}
                  onPress={() => { setCount(option); setCustom(false); }} />)}
                <Pill label={t('Personalizado')} selected={custom} onPress={() => setCustom(true)} />
              </View>
              {custom && <TextInput accessibilityLabel={t('Número de cuotas')} keyboardType="number-pad"
                value={count} onChangeText={setCount} style={input} />}
              <Text style={normal}>{t('Tasa de interés')} (%)</Text>
              <View style={wrap}>
                <Pill label="M.V." selected={!annual} onPress={() => changePeriod(false)} />
                <Pill label="E.A." selected={annual} onPress={() => changePeriod(true)} />
                <Pill label={t('Sin intereses')} selected={free} onPress={() => setFree(!free)} />
              </View>
              <TextInput accessibilityLabel={t('Tasa de interés')} keyboardType="decimal-pad" editable={!free}
                value={free ? '0' : rate} onChangeText={setRate} style={input} />
              <Text style={normal}>{t('Primera cuota estimada')}</Text>
              <DatePicker value={due} onChange={setDue} />
              {!plan && <Text style={muted}>{t('Revisa el importe, la tasa, el plazo (1–120 cuotas) y la fecha de la primera cuota.')}</Text>}
            </>}
            {plan && <>
              <Text style={muted}>{t('Cuota fija estimada')}</Text>
              <Text style={{ ...heading, color: colors.primary }}>{money(plan.estimated)}</Text>
              <Text style={normal}>{count} {t('cuotas proyectadas')} · {free ? '0' : rate}% {annual ? 'E.A.' : 'M.V.'}</Text>
              <Text style={normal}>{t('Intereses totales')} · {money(plan.interest)}</Text>
              <Text style={normal}>{t('Total a pagar')} · {money(plan.total)}</Text>
              <Text style={normal}>{t('Última cuota estimada')} · {plan.rows.at(-1)?.date}</Text>
              {showPlan && plan.rows.map(row => (
                <View key={row.number} style={{ borderRadius: radius.sm, backgroundColor: colors.surface, padding: spacing.md, gap: 4 }}>
                  <Text style={{ ...normal, fontWeight: '700' }}>{t('Cuota')} {row.number} · {row.date} · {money(row.payment)}</Text>
                  <Text style={muted}>{t('Capital')} {money(row.capital)} · {t('Interés')} {money(row.interest)}</Text>
                  <Text style={muted}>{t('Saldo pendiente')} · {money(row.remaining)}</Text>
                </View>
              ))}
              <Pill label={t(showPlan ? 'Editar condiciones de la simulación' : 'Revisar plan de pagos')} onPress={() => setShowPlan(!showPlan)} />
              {example && <Pill label={t('Volver al detalle')} onPress={() => setShowCard(true)} />}
            </>}
          </>}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
