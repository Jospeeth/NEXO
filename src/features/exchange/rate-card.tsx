import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useLanguage } from '../../shared/language/language';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { Pill } from '../../shared/ui/date-controls';
import { refreshExchangeRate, saveExchangeKey, saveManualRate, savePrimaryCurrency } from './repository';
import { useExchange } from './use-exchange';

export function ExchangeRateCard() {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const { settings, reload } = useExchange();
  const [key, setKey] = useState('');
  const [rate, setRate] = useState('');
  const [editor, setEditor] = useState<'key' | 'rate' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const quote = settings?.quote;

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await action();
      await reload();
    } catch {
      setMessage('No se pudo guardar o actualizar la configuración.');
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const result = await refreshExchangeRate();
    if (result === 'scheduled') setMessage('Ya se consultó al proveedor en esta franja.');
    if (result === 'unconfigured') setMessage('Configura tu clave de Exchange Rates API.');
    if (result === 'failed') setMessage('No se pudo actualizar la tasa.');
  }

  const inputStyle = { minHeight: 44, color: colors.text, borderBottomWidth: 1, borderColor: colors.border };
  return (
    <View style={{ padding: spacing.lg, borderRadius: radius.card, backgroundColor: colors.surface, gap: spacing.sm }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: '700' }}>{t('Moneda y tasas de cambio')}</Text>
      <Text style={{ color: colors.secondaryText }}>{t('Moneda principal')}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(['USD', 'COP'] as const).map(currency => <Pill key={currency} label={currency}
          selected={settings?.currency === currency} disabled={busy}
          onPress={() => { void run(() => savePrimaryCurrency(currency)); }} />)}
      </View>
      <Text style={{ color: colors.primary, fontWeight: '700' }}>
        {quote ? `1 USD = ${new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(quote.copPerUsd)} COP` : t('Sin cotización USD/COP')}
      </Text>
      {!!quote && <Text style={{ color: colors.secondaryText }}>
        {settings?.manual ? t('Tasa manual') : 'APILayer'} · {t('Última actualización')} · {new Date(quote.quotedAt).toLocaleString(locale)}
      </Text>}
      <Pill label={t('Actualizar tasa')} disabled={busy || settings?.manual} onPress={() => { void run(refresh); }} />
      <Pill label={t('Tasa manual')} disabled={busy} onPress={() => {
        setEditor('rate');
        setKey('');
        setRate(settings?.manual && quote ? String(quote.copPerUsd) : '');
      }} />
      {settings?.manual && <Pill label={t('Usar tasa del proveedor')} disabled={busy}
        onPress={() => { void run(async () => { await saveManualRate(null); setEditor(null); }); }} />}
      <Pill label={settings?.hasKey ? `••••••••  ${t('Cambiar clave')}` : t('Configurar clave')}
        disabled={busy} onPress={() => { setEditor('key'); setKey(''); }} />
      {editor === 'key' && <>
        <TextInput accessibilityLabel={t('Clave de Exchange Rates API')} secureTextEntry
          autoCapitalize="none" autoCorrect={false} value={key} onChangeText={setKey} editable={!busy} style={inputStyle} />
        <Pill label={t('Guardar clave')} disabled={busy || !key.trim()} onPress={() => { void run(async () => {
          await saveExchangeKey(key);
          setKey('');
          setEditor(null);
          if (!settings?.manual) await refresh();
        }); }} />
      </>}
      {editor === 'rate' && <>
        <TextInput accessibilityLabel={t('COP por USD')} keyboardType="decimal-pad" value={rate}
          onChangeText={setRate} editable={!busy} style={inputStyle} />
        <Pill label={t('Guardar tasa')} disabled={busy} onPress={() => {
          const raw = rate.trim().replace(',', '.');
          const parsed = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
          if (!Number.isFinite(parsed) || parsed <= 0) { setMessage('Ingresa una tasa mayor que cero.'); return; }
          void run(async () => { await saveManualRate(parsed); setEditor(null); });
        }} />
      </>}
      {editor !== null && <Pill label={t('Cancelar')} disabled={busy} onPress={() => {
        setKey('');
        setRate('');
        setEditor(null);
      }} />}
      {!!message && <Text accessibilityLiveRegion="polite" style={{ color: colors.secondaryText }}>{t(message)}</Text>}
    </View>
  );
}
