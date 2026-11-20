import { File } from 'expo-file-system';
import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../shared/language/language';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { CsvImportError, parseParkerCsv, type ImportPlan } from './parker-csv';
import { LedgerImportError, replaceLedger } from './replace-ledger';

export function ImportSection({ onImported }: { onImported: () => Promise<void> }) {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);

  async function commit(plan: ImportPlan) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await replaceLedger(plan);
      Alert.alert(t('Importación completada'));
      void onImported().catch(() => undefined);
    } catch (error) {
      const detail = error instanceof LedgerImportError
        ? error.reason === 'missing-key' ? 'La clave de cifrado de esta base no está disponible en el iPhone.'
          : error.reason === 'unsupported-build' ? 'Abre NEXO en una compilación de iOS con SQLCipher.'
            : error.reason === 'busy' ? 'La base de datos está ocupada. Inténtalo de nuevo.'
          : error.reason === 'storage' ? 'Verifica que el dispositivo tenga espacio disponible.'
            : error.reason === 'constraint' ? 'SQLite rechazó un registro durante el reemplazo.'
              : error.stage === 'open' ? 'No se pudo abrir la base de datos cifrada.'
                : 'SQLite no pudo guardar los registros.'
        : 'SQLite no pudo guardar los registros.';
      Alert.alert(t('No se pudo importar'), t(detail) + '\n' + t('Se conservaron tus datos actuales.'));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function chooseFile() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const selection = await File.pickFileAsync({ mimeTypes: ['text/csv', 'text/plain', 'application/vnd.ms-excel'] });
      if (selection.canceled) return;
      const file = selection.result;
      if (file.size > 5 * 1024 * 1024) {
        Alert.alert(t('El CSV supera el límite de 5 MB.'));
        return;
      }

      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const plan = parseParkerCsv(await file.text(), zone);
      const counts = new Intl.NumberFormat(locale);
      const summary = [
        `${t('Cuentas')}: ${counts.format(plan.accounts.length)}`,
        `${t('Movimientos')}: ${counts.format(plan.movements.length)}`,
        `${t('Transferencias internas')}: ${counts.format(plan.transfers)}`,
        '',
        t('El CSV no incluye tipos de cuenta ni saldos de apertura. Se crearán como cuentas corrientes con saldo inicial cero.'),
        t('Se reemplazarán todas las cuentas, movimientos y categorías de NEXO, incluidos sus presupuestos.'),
      ].join('\n');
      Alert.alert(t('Revisar importación'), summary, [
        { text: t('Cancelar'), style: 'cancel' },
        { text: t('Reemplazar datos'), style: 'destructive', onPress: () => { void commit(plan); } },
      ]);
    } catch (error) {
      const message = error instanceof CsvImportError
        ? error.code === 'row' ? `${t('Revisa el registro CSV número')} ${error.row}.`
          : error.code === 'transfer' ? t('El CSV contiene una transferencia incompleta o incompatible.')
            : error.code === 'empty' ? t('El CSV no contiene movimientos.')
              : t('Selecciona un CSV de transacciones exportado desde Parker.')
        : t('No se pudo leer el archivo seleccionado.');
      Alert.alert(t('No se pudo importar'), message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text accessibilityRole="header" style={{ color: colors.secondaryText, fontSize: 13, fontWeight: '600' }}>
        {t('IMPORTACIÓN')}
      </Text>
      <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy}
        onPress={() => { void chooseFile(); }}
        style={({ pressed }) => ({
          minHeight: 48, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
          backgroundColor: pressed ? colors.selected : colors.surface, borderRadius: radius.card,
          borderWidth: 1, borderColor: colors.border,
        })}>
        <Ionicons name="download-outline" size={19} color={colors.primary} />
        <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>
          {busy ? t('Procesando CSV…') : t('Importar desde Parker')}
        </Text>
        <Text style={{ color: colors.secondaryText }}>CSV</Text>
      </Pressable>
    </View>
  );
}
