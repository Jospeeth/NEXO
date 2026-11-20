import { useLanguage } from '../../shared/language/language';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState, Button, Text, TextInput, View } from 'react-native';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { isStale, type ExchangeQuote } from './rate';
import { readQuote, refreshExchangeRate, saveExchangeKey, type RateStatus } from './repository';

interface Props {
  onQuoteChange?: (data: { quote: ExchangeQuote | null; stale: boolean }) => void;
}

export function ExchangeRateCard({ onQuoteChange }: Props) {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const [quote, setQuote] = useState<ExchangeQuote | null>(null);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const [status, setStatus] = useState<RateStatus | 'loading'>('loading');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyError, setKeyError] = useState(false);

  const refresh = useCallback(async (active: () => boolean = () => true) => {
    try {
      const stored = await readQuote();
      if (active()) {
        setQuote(stored);
        const now = Date.now();
        setCheckedAt(now);
        onQuoteChange?.({ quote: stored, stale: stored !== null && isStale(stored, now) });
      }
      const result = await refreshExchangeRate();
      const latest = result === 'updated' ? await readQuote() : stored;
      if (active()) {
        setQuote(latest);
        const now = Date.now();
        setCheckedAt(now);
        onQuoteChange?.({ quote: latest, stale: latest !== null && isStale(latest, now) });
        setStatus(previous => result === 'scheduled' && previous === 'failed' ? previous : result);
      }
    } catch {
      if (active()) setStatus('failed');
    }
  }, [onQuoteChange]);

  useFocusEffect(useCallback(() => {
    let focused = true;
    const poll = () => {
      if (AppState.currentState === 'active') void refresh(() => focused);
    };
    poll();
    const timer = setInterval(poll, 60_000);
    const subscription = AppState.addEventListener('change', poll);
    return () => {
      focused = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [refresh]));

  async function configure() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setKeyError(false);
    try {
      await saveExchangeKey(draft);
      setDraft('');
      setEditing(false);
      await refresh();
    } catch {
      setKeyError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ padding: spacing.lg, borderRadius: radius.card, backgroundColor: colors.surface, gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: '700' }}>{t("Tasa USD/COP")}</Text>
      {quote && <>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>
          1 USD = {new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(quote.copPerUsd)} COP
        </Text>
        <Text style={{ color: colors.secondaryText }}>
          {t("Cotización de APILayer ·")} {new Date(quote.quotedAt).toLocaleString(locale, { timeZone: 'America/Bogota' })}
          {isStale(quote, checkedAt) ? " · " + t("Desactualizada") : ""}
        </Text>
      </>}
      {!quote && status === 'loading' && <Text style={{ color: colors.secondaryText }}>{t("Consultando…")}</Text>}
      {!quote && status === 'scheduled' && <Text style={{ color: colors.secondaryText }}>{t("Próximo intento en la siguiente franja.")}</Text>}
      {status === 'unconfigured' && <Text style={{ color: colors.secondaryText }}>{t("Configura tu clave de Exchange Rates API.")}</Text>}
      {status === 'failed' && <Text accessibilityRole="alert" style={{ color: colors.secondaryText }}>
        {t("No se pudo actualizar. Revisa la clave, la conexión y el acceso HTTPS de tu plan.")}
      </Text>}
      {quote && !editing && <Button title={t("Comprobar actualización")} color={colors.primary}
        onPress={() => { void refresh(); }} />}
      {editing ? <>
        <TextInput accessibilityLabel={t("Clave de Exchange Rates API")} placeholder={t("Clave de APILayer")}
          placeholderTextColor={colors.secondaryText} value={draft} onChangeText={setDraft}
          autoCapitalize="none" autoCorrect={false} secureTextEntry editable={!saving}
          style={{ minHeight: 44, color: colors.text, borderBottomWidth: 1, borderColor: colors.border }} />
        {keyError && <Text accessibilityRole="alert" style={{ color: colors.expense }}>{t("No se pudo guardar la clave.")}</Text>}
        <Button color={colors.primary} title={t("Guardar clave")} disabled={saving || !draft.trim()} onPress={configure} />
        <Button color={colors.primary} title={t("Cancelar")} disabled={saving}
          onPress={() => { setDraft(''); setKeyError(false); setEditing(false); }} />
      </> : (status === 'unconfigured' || status === 'failed' || (!quote && status === 'scheduled')) &&
        <Button color={colors.primary} title={t("Configurar clave")} onPress={() => setEditing(true)} />}
    </View>
  );
}
