import { isCalendarDate } from '../features/accounts/card-profile';
import { useState } from 'react';
import { TransferSheet } from '../features/transfers/transfer-sheet';
import { useLanguage } from '../shared/language/language';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddTransactionSheet } from '../features/transactions/add-transaction-sheet';
import { useLedger } from '../features/transactions/use-ledger';

function EditMovement({ id, onDismiss }: { id: string; onDismiss: () => void }) {
  const { t } = useLanguage();
  const { ledger, failed } = useLedger();
  const initial = ledger?.movements.find(item => String(item.id) === id);
  if (initial && !initial.transferGroup) return <AddTransactionSheet initial={initial} onDismiss={onDismiss} />;
  return (
    <SafeAreaView>
      <Text>{failed ? t("No se pudo cargar el movimiento.") : ledger ? t("Movimiento no encontrado.") : t("Cargando…")}</Text>
      <Text accessibilityRole="button" onPress={onDismiss}>{t("Cerrar")}</Text>
    </SafeAreaView>
  );
}

export default function AddRoute() {
  const router = useRouter();
  const { edit, mode, accountId, amountMinor, occurrence, currency } = useLocalSearchParams<{
    edit?: string; mode?: string; accountId?: string; amountMinor?: string; occurrence?: string; currency?: string;
  }>();
  const [transfer, setTransfer] = useState(mode === 'transfer');

  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  if (mode === 'management-fee' && occurrence && isCalendarDate(occurrence) && currency && /^[A-Z]{3}$/.test(currency)) {
    const id = Number(accountId);
    const minor = Number(amountMinor);
    if (Number.isSafeInteger(id) && id > 0 && Number.isSafeInteger(minor) && minor > 0) {
      return <AddTransactionSheet feeDraft={{ accountId: id, amountMinor: minor, occurrence, currency }} onDismiss={dismiss} />;
    }
  }
  if (edit) return <EditMovement id={edit} onDismiss={dismiss} />;
  if (transfer) return <TransferSheet onDismiss={dismiss} onBack={() => setTransfer(false)} />;
  return <AddTransactionSheet onDismiss={dismiss} onTransfer={() => setTransfer(true)} />;
}
