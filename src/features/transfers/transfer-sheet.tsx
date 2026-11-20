import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { localDay } from '../../shared/date/local-day';
import { useLanguage } from '../../shared/language/language';
import { radius, spacing, type, useTheme } from '../../shared/theme/theme';
import { DatePicker, Pill } from '../../shared/ui/date-controls';
import { displayBalance, parseOpening, type SavedAccount } from '../accounts/account';
import { loadAccounts } from '../accounts/repository';
import { createTransfer } from './repository';

export function TransferSheet({ onBack, onDismiss }: { onBack: () => void; onDismiss: () => void }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState<SavedAccount[] | null>(null);
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(localDay);
  const [saving, setSaving] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const pending = useRef(false);
  const source = accounts?.find(account => account.id === fromId);
  const destinations = accounts?.filter(account => account.id !== fromId && account.currency === source?.currency) ?? [];
  const amountMinor = parseOpening(amount);
  const eligible = accounts?.filter(account => accounts.some(other => other.id !== account.id && other.currency === account.currency));
  const inputStyle = { color: colors.text, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, minHeight: 46 };

  useEffect(() => {
    let active = true;
    void loadAccounts().then(
      result => { if (active) setAccounts(result); },
      () => { if (active) setLoadError(true); }
    );
    return () => { active = false; };
  }, [loadAttempt]);

  async function save() {
    if (pending.current || fromId === null || toId === null || amountMinor === null || amountMinor <= 0 ||
      !destinations.some(account => account.id === toId)) return;
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      await createTransfer({ fromId, toId, amountMinor, note, date });
      onDismiss();
    } catch {
      setSaveError(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  function option(account: SavedAccount, selected: boolean, select: () => void) {
    return <Pill key={account.id} selected={selected}
      label={`${account.name} · ${displayBalance({ currency: account.currency, openingMinor: account.balanceMinor })}`}
      onPress={() => { if (!saving) select(); }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.page, gap: spacing.md }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: type.title, fontWeight: '700' }}>{t('Transferencia interna')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Pill label={t('Ingreso o gasto')} onPress={() => { if (!saving) onBack(); }} />
            <Pill label={t('Cerrar')} onPress={() => { if (!saving) onDismiss(); }} />
          </View>
          {loadError ? <>
            <Text accessibilityRole="alert" style={{ color: colors.expense }}>{t('No se pudieron cargar las cuentas.')}</Text>
            <Pill label={t('Reintentar')} onPress={() => { setLoadError(false); setLoadAttempt(value => value + 1); }} />
          </> : eligible === undefined ? <Text style={{ color: colors.secondaryText }}>{t('Cargando…')}</Text>
            : eligible.length === 0 ? <Text style={{ color: colors.secondaryText }}>{t('Necesitas dos cuentas en la misma moneda.')}</Text>
            : <>
              <Text style={{ color: colors.secondaryText }}>{t('Importe')}{source ? ' · ' + source.currency : ''}</Text>
              <TextInput accessibilityLabel={t('Importe')} keyboardType="decimal-pad" placeholder="0.00"
                placeholderTextColor={colors.secondaryText} value={amount} onChangeText={setAmount}
                editable={!saving} style={[inputStyle, { fontSize: type.amountInput, fontVariant: ['tabular-nums'] }]} />
              <Text style={{ color: colors.text, fontWeight: '600' }}>{t('Cuenta de origen')}</Text>
              {eligible.map(account => option(account, account.id === fromId, () => {
                if (account.id !== fromId) {
                  setFromId(account.id);
                  setToId(null);
                }
              }))}
              {fromId !== null && <>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{t('Cuenta de destino')}</Text>
                {destinations.map(account => option(account, account.id === toId, () => setToId(account.id)))}
              </>}
              <Text style={{ color: colors.secondaryText }}>{t('Nota (opcional)')}</Text>
              <TextInput accessibilityLabel={t('Nota opcional')} value={note} onChangeText={setNote}
                maxLength={120} editable={!saving} style={inputStyle} />
              <Text style={{ color: colors.secondaryText }}>{t('Fecha')}</Text>
              <DatePicker value={date} onChange={value => { if (!saving) setDate(value); }} />
              {!!amount.trim() && (amountMinor === null || amountMinor <= 0) &&
                <Text accessibilityRole="alert" style={{ color: colors.expense }}>{t('Introduce un importe mayor que cero con hasta dos decimales.')}</Text>}
              {saveError && <Text accessibilityRole="alert" style={{ color: colors.expense }}>{t('No se pudo guardar la transferencia.')}</Text>}
              {saving || fromId === null || toId === null || amountMinor === null || amountMinor <= 0
                ? <Text accessibilityState={{ disabled: true }} style={{ color: colors.secondaryText, padding: spacing.md }}>
                    {t(saving ? 'Guardando…' : 'Guardar transferencia')}
                  </Text>
                : <Pill label={t('Guardar transferencia')} selected onPress={() => { void save(); }} />}
            </>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
