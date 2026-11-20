import { useLanguage } from '../../shared/language/language';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../shared/theme/theme';
import { displayBalance, parseOpening, type SavedAccount } from '../accounts/account';
import { loadMovements, recordMovement, type Movement, type MovementKind } from './repository';

interface Props {
  account: SavedAccount;
  color: string;
  onSaved: () => Promise<void>;
}

export function MovementPanel({ account, color, onSaved }: Props) {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const [kind, setKind] = useState<MovementKind>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<Movement[] | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const minor = parseOpening(amount);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadMovements(account.id).then(
      rows => { if (active) setItems(rows); },
      () => { if (active) setError(t("No se pudo cargar el historial.")); }
    );
    return () => { active = false; };
  }, [account.id, t]));

  async function save() {
    if (pending.current || minor === null || minor <= 0) return;
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      await recordMovement(account.id, { kind, amountMinor: minor, note });
      setAmount('');
      setNote('');
      try {
        const [rows] = await Promise.all([loadMovements(account.id), onSaved()]);
        setItems(rows);
      } catch {
        setError(t("Movimiento guardado. Vuelve a abrir la cuenta para actualizar el historial."));
      }
    } catch {
      setError(t("No se pudo guardar el movimiento. Inténtalo de nuevo."));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ color, fontSize: 23, fontWeight: '600' }}>{t("Registrar movimiento")}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Button color={colors.primary} title={kind === 'income' ? '✓ Ingreso' : t("Ingreso")} disabled={saving} onPress={() => setKind('income')} />
        <Button color={colors.primary} title={kind === 'expense' ? '✓ Gasto' : t("Gasto")} disabled={saving} onPress={() => setKind('expense')} />
      </View>
      <Text style={{ color }}>{t("Importe ·")} {account.currency}</Text>
      <TextInput accessibilityLabel={`Importe en ${account.currency}`} placeholder="0,00"
        placeholderTextColor={color} keyboardType="decimal-pad" value={amount}
        onChangeText={setAmount} editable={!saving} style={{ color, fontSize: 24, minHeight: 44 }} />
      <Text style={{ color }}>{t("Nota (opcional)")}</Text>
      <TextInput accessibilityLabel={t("Nota opcional")} value={note} onChangeText={setNote}
        editable={!saving} maxLength={120} style={{ color, minHeight: 44, borderBottomWidth: 1, borderColor: color }} />
      {amount.length > 0 && (minor === null || minor <= 0) &&
        <Text style={{ color }}>{t("Introduce un importe mayor que cero con hasta dos decimales.")}</Text>}
      <Button color={colors.primary} title={saving ? t("Guardando…") : t("Guardar movimiento")} disabled={saving || minor === null || minor <= 0} onPress={save} />
      {!!error && <Text accessibilityRole="alert" style={{ color }}>{error}</Text>}
      <Text accessibilityRole="header" style={{ color, fontSize: 23, fontWeight: '600' }}>{t("Historial")}</Text>
      {items?.length === 0 && <Text style={{ color }}>{t("Esta cuenta aún no tiene movimientos.")}</Text>}
      {items?.map(item => (
        <View key={item.id} style={{ borderTopWidth: 1, borderColor: color, paddingVertical: 10, gap: 4 }}>
          <Text style={{ color: item.kind === 'income' ? colors.income : colors.expense, fontWeight: '600' }}>
            {item.kind === 'income' ? t("Ingreso +") : t("Gasto −")}
            {displayBalance({ currency: account.currency, openingMinor: item.amountMinor })}
          </Text>
          {!!item.note && <Text style={{ color }}>{item.note}</Text>}
          <Text style={{ color }}>{new Date(item.recordedAt).toLocaleDateString(locale)}</Text>
        </View>
      ))}
    </View>
  );
}
