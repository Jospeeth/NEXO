import { File } from 'expo-file-system';
import { useRef, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../../shared/language/language';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { Pill } from '../../shared/ui/date-controls';
import { database } from '../../infrastructure/storage/database';
import { createRecoveryCode, exportBackup, isRecoveryCode, maxBackupBytes, openBackup } from './backup-file';
import {
  automaticBackupAvailable, chooseAutomaticBackupFolder, prepareAutomaticBackup,
  saveAutomaticBackup, stopAutomaticBackup, useAutomaticBackupStatus,
} from './automatic-backup';
import { restoreLedgerBackup, type LedgerBackup } from './ledger-backup';

type Draft = { mode: 'export' | 'automatic'; code: string } | { mode: 'restore'; file: File };

export function BackupSection({ onRestored }: { onRestored: () => Promise<void> }) {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const automatic = useAutomaticBackupStatus();

  function clear() {
    setDraft(null);
    setCode('');
  }

  async function run(action: () => Promise<void>, failure: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await action();
    } catch {
      Alert.alert(t(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function pickBackup() {
    const selected = await File.pickFileAsync({});
    if (selected.canceled) return;
    if (selected.result.size > maxBackupBytes) {
      Alert.alert(t('El respaldo supera el límite de 20 MB.'));
      return;
    }
    setDraft({ mode: 'restore', file: selected.result });
  }

  function confirmRestore(snapshot: LedgerBackup) {
    const counts = new Intl.NumberFormat(locale);
    const summary = [
      `${t('Cuentas')}: ${counts.format(snapshot.rows.accounts.length)}`,
      `${t('Categorías')}: ${counts.format(snapshot.rows.categories.length)}`,
      `${t('Movimientos')}: ${counts.format(snapshot.rows.movements.length)}`,
      '',
      t('Este respaldo reemplazará los datos financieros de NEXO en este dispositivo.'),
    ].join('\n');

    Alert.alert(t('Revisar respaldo'), summary, [
      { text: t('Cancelar'), style: 'cancel' },
      { text: t('Reemplazar datos'), style: 'destructive', onPress: () => {
        void run(async () => {
          restoreLedgerBackup(await database(), snapshot);
          Alert.alert(t('Respaldo restaurado'));
          void onRestored().catch(() => undefined);
        }, 'No se pudo restaurar el respaldo. Se conservaron tus datos actuales.');
      } },
    ]);
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text accessibilityRole="header" style={{ color: colors.secondaryText, fontSize: 13, fontWeight: '600' }}>
        {t('RESPALDO DE NEXO')}
      </Text>
      <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
        borderRadius: radius.card, padding: spacing.md, gap: spacing.sm }}>
        <Text style={{ color: colors.text }}>
          {t('Guarda una copia cifrada en iCloud Drive desde Archivos. Úsala para recuperar tus datos en otro iPhone.')}
        </Text>
        {!draft && automaticBackupAvailable && <>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{t('Respaldo automático')}</Text>
          {automatic.enabled && <Text accessibilityLiveRegion="polite" style={{ color: colors.secondaryText }}>
            {automatic.saving ? t('Guardando respaldo…')
              : automatic.error ? t('No se pudo acceder a la carpeta. Vuelve a seleccionarla o reintenta.')
                : automatic.savedAt !== null ? `${t('Último respaldo guardado')} · ${new Date(automatic.savedAt).toLocaleString(locale)}`
                  : t('Activado')}
          </Text>}
          <Pill label={t(automatic.enabled ? 'Código y carpeta del respaldo automático' : 'Activar respaldo automático')}
            disabled={busy} onPress={() => {
              void run(async () => setDraft({ mode: 'automatic', code: await prepareAutomaticBackup() }),
                'No se pudo preparar el respaldo automático.');
            }} />
          {automatic.enabled && automatic.error && (
            <Pill label={t('Reintentar')} disabled={busy} onPress={() => { void saveAutomaticBackup(); }} />
          )}
          {automatic.enabled && <Pill label={t('Desactivar respaldo automático')} disabled={busy}
            onPress={() => { void run(stopAutomaticBackup, 'No se pudo desactivar el respaldo automático.'); }} />}
        </>}
        {!draft && <>
          <Pill label={t('Crear respaldo cifrado')} disabled={busy} onPress={() => {
            void run(async () => setDraft({ mode: 'export', code: await createRecoveryCode() }), 'No se pudo crear el respaldo.');
          }} />
          <Pill label={t('Restaurar respaldo de NEXO')} disabled={busy} onPress={() => {
            void run(pickBackup, 'No se pudo leer el archivo seleccionado.');
          }} />
        </>}
        {(draft?.mode === 'export' || draft?.mode === 'automatic') && <>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{t('Código de recuperación')}</Text>
          <Text selectable style={{ color: colors.text, fontFamily: 'Courier', letterSpacing: 0.5,
            padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surfaceSubtle }}>
            {draft.code.match(/.{8}/g)?.join(' ')}
          </Text>
          <Text style={{ color: colors.secondaryText }}>
            {t('Guarda el código por separado, en tu gestor de contraseñas. Lo necesitarás para abrir este archivo.')}
          </Text>
          {draft.mode === 'automatic' ? <>
            <Text style={{ color: colors.secondaryText }}>{t('Elige una carpeta en iCloud Drive. NEXO actualizará ahí el respaldo cuando uses la app.')}</Text>
            <Pill label={t('Elegir carpeta en iCloud Drive')} disabled={busy} onPress={() => {
              void run(async () => {
                if (await chooseAutomaticBackupFolder(draft.code)) clear();
              }, 'No se pudo configurar la carpeta de respaldo.');
            }} />
          </> : <Pill label={t('Abrir Guardar en Archivos')} disabled={busy} onPress={() => {
            void run(() => exportBackup(draft.code), 'No se pudo crear el respaldo.');
          }} />}
        </>}
        {draft?.mode === 'restore' && <>
          <TextInput value={code} onChangeText={setCode} editable={!busy} secureTextEntry
            autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('Código de recuperación')}
            placeholder={t('Código de recuperación')} placeholderTextColor={colors.secondaryText}
            style={{ minHeight: 44, color: colors.text, paddingHorizontal: spacing.md,
              backgroundColor: colors.surfaceSubtle, borderRadius: radius.sm }} />
          <Pill label={t('Revisar respaldo')} disabled={busy || !isRecoveryCode(code)} onPress={() => {
            void run(async () => {
              const snapshot = await openBackup(draft.file, code);
              clear();
              confirmRestore(snapshot);
            }, 'No se pudo abrir el respaldo. Comprueba el archivo y el código de recuperación.');
          }} />
        </>}
        {draft && <Pill label={t('Cerrar')} disabled={busy} onPress={clear} />}
      </View>
    </View>
  );
}
