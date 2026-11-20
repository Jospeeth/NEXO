import { GlassView } from '../../shared/ui/GlassView';
import { useLanguage } from '../../shared/language/language';
import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { accountKinds, displayBalance, type AccountKind, type Currency } from '../accounts/account';
import { localDay } from '../../shared/date/local-day';
import { useLedger } from './use-ledger';
import { Pill } from '../../shared/ui/date-controls';
import { radius, spacing, type, useTheme } from '../../shared/theme/theme';
import { deleteMovement, type Movement } from './repository';

export function TransactionsScreen() {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const { ledger, failed, refresh } = useLedger();
  const { accounts, movements } = ledger ?? { accounts: [], movements: [] };
  const money = (openingMinor: number, currency?: Currency) => currency ? displayBalance({ currency, openingMinor }) : '—';
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<AccountKind | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const detail = movements.find(item => item.id === selected);
  const detailAccount = accounts.find(item => item.id === detail?.accountId);
  const transferPair = detail?.transferGroup
    ? movements.find(item => item.transferGroup === detail.transferGroup && item.id !== detail.id)
    : undefined;
  const counterpart = transferPair && accounts.find(account => account.id === transferPair.accountId);
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  const rows = movements.filter(item => {
    const account = accounts.find(candidate => candidate.id === item.accountId);
    return (!kind || account?.kind === kind) && normalize(item.note + ' ' + (item.categoryName ?? '') + (item.transferGroup ? ' ' + t('Transferencia') : '')).includes(normalize(search));
  }).sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.id - a.id);

  function confirmDelete(movement: Movement) {
    Alert.alert(t("Eliminar transacción"), movement.transferGroup ? t("Se eliminarán ambos lados de la transferencia.") : t("¿Quieres eliminar este movimiento? Esta acción no se puede deshacer."), [
      { text: t("Cancelar"), style: 'cancel' },
      { text: t("Eliminar"), style: 'destructive', onPress: () => {
        void deleteMovement(movement.id).then(async () => {
          setSelected(null);
          await refresh();
        }, () => Alert.alert(t("No se pudo eliminar el movimiento")));
      } },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.page, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: type.title, fontWeight: '700' }}>{t("Movimientos")}</Text>
          <Pill label={t('Transferir')} onPress={() => router.push({ pathname: '/add', params: { mode: 'transfer' } })} />
        </View>
        <GlassView>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
            <Ionicons name="search-outline" size={19} color={colors.secondaryText} />
            <TextInput accessibilityLabel={t("Buscar transacciones por concepto")} placeholder={t("Buscar movimientos")}
              placeholderTextColor={colors.secondaryText} value={search} onChangeText={setSearch}
              autoCorrect={false} style={{ color: colors.text, flex: 1, minHeight: 44 }} />
          </View>
        </GlassView>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Pill label={`${kind ? t(accountKinds[kind]) : t("Todos los tipos")} ▾`} onPress={() => setFilterOpen(!filterOpen)} />
          {(!!search || kind !== null) && <Pill label={t("Limpiar filtros")} onPress={() => { setSearch(''); setKind(null); }} />}
        </View>
        {filterOpen && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[null, ...new Set(accounts.map(item => item.kind))].map(value =>
            <Pill key={value ?? 'all'} label={value ? t(accountKinds[value]) : t("Todos")} selected={value === kind}
              onPress={() => { setKind(value); setFilterOpen(false); }} />)}
        </View>}
      </View>
      <FlatList data={rows} keyExtractor={item => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.page, paddingBottom: 108, gap: 8 }}
        ListEmptyComponent={failed ? <Pill label={t("Reintentar carga")} onPress={() => { void refresh(); }} /> :
          <Text style={{ color: colors.secondaryText }}>{ledger ? t("No encontramos movimientos.") : t("Cargando movimientos…")}</Text>}
        renderItem={({ item, index }) => {
          const account = accounts.find(candidate => candidate.id === item.accountId);
          return <View style={{ gap: 8 }}>
            {rows[index - 1]?.transactionDate !== item.transactionDate &&
              <Text style={{ color: colors.secondaryText }}>{new Date(item.transactionDate + 'T12:00:00').toLocaleDateString(locale)}</Text>}
            <Pressable accessibilityRole="button" onPress={() => setSelected(item.id)}
              style={({ pressed }) => ({ backgroundColor: pressed ? colors.selected : colors.surface, padding: 14, borderRadius: radius.card, gap: 4 })}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.categoryEmoji ?? '📦'} {item.note || item.categoryName || (item.transferGroup ? t("Transferencia") : t("Sin categoría"))}</Text>
              <Text style={{ color: colors.secondaryText }}>{account?.name}{item.transferGroup ? " · " + t("Transferencia") : ""}{item.transactionDate > localDay() ? " · " + t("Pendiente") : ""}</Text>
              <Text style={{ color: item.kind === 'income' ? colors.income : colors.expense, fontWeight: '600' }}>
                {item.kind === 'income' ? '+' : '−'}{money(item.amountMinor, account?.currency)}
              </Text>
            </Pressable>
          </View>;
        }} />
      <Modal visible={!!detail} presentationStyle="pageSheet" animationType="slide" onRequestClose={() => setSelected(null)}>
        {detail && <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.page, gap: 12 }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: type.title, fontWeight: '700' }}>{t("Detalle")}</Text>
          <Text style={{ color: colors.text }}>{detail.transferGroup ? t("Transferencia") : detail.kind === 'income' ? t("Ingreso") : t("Gasto")}</Text>
          <Text style={{ color: colors.primary, fontSize: type.balance, fontWeight: '700' }}>
            {money(detail.amountMinor, detailAccount?.currency)}
          </Text>
          <Text style={{ color: colors.text }}>{detail.note || t("Sin descripción")}</Text>
          <Text style={{ color: colors.text }}>{detailAccount?.name} · {detail.categoryEmoji ?? '📦'} {detail.categoryName}</Text>
          {detail.transferGroup && counterpart && (
            <Text style={{ color: colors.text }}>
              {t('Cuenta de origen')}: {detail.kind === 'expense' ? detailAccount?.name : counterpart.name}
              {'\n'}{t('Cuenta de destino')}: {detail.kind === 'income' ? detailAccount?.name : counterpart.name}
            </Text>
          )}
          <Text style={{ color: colors.text }}>{new Date(detail.transactionDate + 'T12:00:00').toLocaleDateString(locale)}</Text>
          {!detail.transferGroup && <Pill label={t("Editar")} onPress={() => { setSelected(null); router.push({ pathname: '/add', params: { edit: String(detail.id) } }); }} />}
          <Pill label={t("Eliminar")} onPress={() => confirmDelete(detail)} />
          <Pill label={t("Cerrar")} onPress={() => setSelected(null)} />
        </SafeAreaView>}
      </Modal>
    </SafeAreaView>
  );
}
