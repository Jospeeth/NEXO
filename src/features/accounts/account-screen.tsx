import { MissingKey, SQLCipherUnavailable } from '../../infrastructure/storage/unlock';
import { CardCycleFields, type CardCycleDraft } from './card-cycle-fields';
import { cardCycleDates, parseBillingDay } from './card-cycle';
import { localDay } from '../../shared/date/local-day';
import { InstallmentPreview } from '../installments/installment-preview';
import { useLanguage } from '../../shared/language/language';
import { BudgetField } from '../../shared/ui/budget-field';
import { AccountColorField } from './account-color-field';
import { normalizeAccountColor } from './account-color';
import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Alert,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { Pill } from '../../shared/ui/date-controls';
import { AccountCard } from '../../shared/ui/AccountCard';
import { TransactionRow } from '../../shared/ui/TransactionRow';
import {
  accountKinds,
  currencies,
  parseOpening,
  type AccountKind,
  type Currency,
  type SavedAccount,
} from './account';
import { createAccount, loadAccounts, updateAccount, deleteAccount } from './repository';
import { loadMovements, type Movement } from '../transactions/repository';

export default function AccountScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();

  const [accounts, setAccounts] = useState<SavedAccount[] | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [movementsFailed, setMovementsFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeAccountMovements, setActiveAccountMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // New account form state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<AccountKind>('checking');
  const [newCurrency, setNewCurrency] = useState<Currency>('COP');
  const [newColor, setNewColor] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newCycle, setNewCycle] = useState<CardCycleDraft>({ statement: '', payment: '' });
  const [newOpening, setNewOpening] = useState('0');

  // Edit account state
  const [cardPreview, setCardPreview] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SavedAccount | null>(null);
  const [editBudget, setEditBudget] = useState('');
  const [editCycle, setEditCycle] = useState<CardCycleDraft>({ statement: '', payment: '' });
  const [editColor, setEditColor] = useState('');
  const [editName, setEditName] = useState('');
  const [editKind, setEditKind] = useState<AccountKind>('checking');
  const [editCurrency, setEditCurrency] = useState<Currency>('COP');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refreshId = useRef(0);
  const refreshAccounts = useCallback(async () => {
    const request = ++refreshId.current;
    setAccountsError(null);
    setMovementsFailed(false);
    let rows: SavedAccount[];
    try {
      rows = await loadAccounts();
    } catch (error) {
      if (request === refreshId.current) {
        setAccountsError(error instanceof MissingKey ? 'El llavero de este dispositivo no tiene la clave de la base de datos.'
          : error instanceof SQLCipherUnavailable ? 'Esta compilación no puede abrir la base de datos cifrada.'
            : 'No se pudieron cargar las cuentas.');
        setLoadingMovements(false);
      }
      return;
    }

    if (request !== refreshId.current) return;
    setAccounts(rows);
    const currentAccount = rows[Math.min(activeIndex, rows.length - 1)];
    if (!currentAccount) {
      setActiveIndex(0);
      setActiveAccountMovements([]);
      setLoadingMovements(false);
      return;
    }

    setLoadingMovements(true);
    try {
      const movements = await loadMovements(currentAccount.id);
      if (request === refreshId.current) setActiveAccountMovements(movements);
    } catch {
      if (request === refreshId.current) setMovementsFailed(true);
    } finally {
      if (request === refreshId.current) setLoadingMovements(false);
    }
  }, [activeIndex]);

  useFocusEffect(
    useCallback(() => {
      void refreshAccounts();
    }, [refreshAccounts])
  );

  const activeAccount = accounts && accounts.length > 0 ? accounts[Math.min(activeIndex, accounts.length - 1)] : null;

  const onCardScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const cardWidth = 300;
    const index = Math.round(offsetX / cardWidth);
    if (accounts && index >= 0 && index < accounts.length && index !== activeIndex) {
      setActiveIndex(index);

    }
  };

  async function handleCreateAccount() {
    if (saving) return;
    const color = normalizeAccountColor(newColor);
    if (newColor.trim() && !color) {
      setError(t("Ingresa un color HEX válido."));
      return;
    }
    const statementDay = newKind === 'credit_card' ? parseBillingDay(newCycle.statement) : null;
    const paymentDay = newKind === 'credit_card' ? parseBillingDay(newCycle.payment) : null;
    if (statementDay === undefined || paymentDay === undefined) {
      setError(t('Ingresa días de corte y pago entre 1 y 31.'));
      return;
    }
    const budgetMinor = newKind === 'credit_card' && newBudget.trim() ? parseOpening(newBudget) : null;
    if (newKind === 'credit_card' && newBudget.trim() && (budgetMinor === null || budgetMinor <= 0)) {
      setError(t("Ingresa un presupuesto mensual mayor que cero."));
      return;
    }
    const minor = parseOpening(newOpening);
    if (!newName.trim()) {
      setError(t("Ingresa un nombre para la cuenta."));
      return;
    }
    if (minor === null) {
      setError(t("Ingresa un saldo inicial válido."));
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createAccount({
        name: newName.trim(),
        kind: newKind,
        currency: newCurrency,
        openingMinor: minor,
        budgetMinor,
        statementDay,
        paymentDay,
        color,
      });

      setIsCreating(false);
      setNewName('');
      setNewColor('');
      setNewBudget('');
      setNewCycle({ statement: '', payment: '' });
      setNewOpening('0');
      await refreshAccounts();
    } catch {
      setError(t("No se pudo crear la cuenta."));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(acc: SavedAccount) {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditColor(acc.color ?? '');
    setEditCycle({ statement: String(acc.statementDay ?? ''), payment: String(acc.paymentDay ?? '') });
    setEditBudget(acc.budgetMinor == null ? '' : String(acc.budgetMinor / 100));
    setEditKind(acc.kind);
    setEditCurrency(acc.currency);
    setError('');
  }

  async function handleSaveAccountEdit() {
    if (!editingAccount || saving) return;
    const color = normalizeAccountColor(editColor);
    if (editColor.trim() && !color) {
      setError(t("Ingresa un color HEX válido."));
      return;
    }
    const statementDay = editKind === 'credit_card' ? parseBillingDay(editCycle.statement) : null;
    const paymentDay = editKind === 'credit_card' ? parseBillingDay(editCycle.payment) : null;
    if (statementDay === undefined || paymentDay === undefined) {
      setError(t('Ingresa días de corte y pago entre 1 y 31.'));
      return;
    }
    const budgetMinor = editKind === 'credit_card' && editBudget.trim() ? parseOpening(editBudget) : null;
    if (editKind === 'credit_card' && editBudget.trim() && (budgetMinor === null || budgetMinor <= 0)) {
      setError(t("Ingresa un presupuesto mensual mayor que cero."));
      return;
    }
    if (!editName.trim()) {
      setError(t("El nombre de la cuenta no puede estar vacío."));
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateAccount(editingAccount.id, {
        name: editName.trim(),
        kind: editKind,
        currency: editCurrency,
        budgetMinor,
        statementDay,
        paymentDay,
        color,
      });

      setEditingAccount(null);
      await refreshAccounts();
    } catch {
      setError(t("No se pudo actualizar la cuenta."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount(acc: SavedAccount) {
    setSaving(true);
    try {
      await deleteAccount(acc.id);
      setEditingAccount(null);
      setActiveIndex(0);
      await refreshAccounts();
    } catch {
      setError(t("No se pudo eliminar la cuenta."));
    } finally {
      setSaving(false);
    }
  }

  const cycle = activeAccount?.statementDay && activeAccount.paymentDay
    ? cardCycleDates(localDay(), activeAccount.statementDay, activeAccount.paymentDay) : null;
  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Screen Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerSubtitle, { color: colors.primary }]}>NEXO FINANCE</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t("Mis Cuentas")}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable
              onPress={() => router.push('/settings')}
              style={[styles.manageCatBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={t("Gestionar categorías")}
            >
              <Text style={[styles.manageCatText, { color: colors.secondaryText }]}>{t("Categorías")}</Text>
            </Pressable>
            <Pressable
              onPress={() => setIsCreating(true)}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={t("Crear nueva cuenta")}
            >
              <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>{t("+ Nueva")}</Text>
            </Pressable>
          </View>
        </View>

        {/* Modal / Card Creation Form */}
        {isCreating && (
          <View style={[styles.createCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Text style={[styles.createTitle, { color: colors.text }]}>{t("Crear nueva cuenta")}</Text>

            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>{t("Nombre de la cuenta")}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
              placeholder={t("Ej. Principal, Ahorros viajes...")}
              placeholderTextColor={colors.tertiaryText}
              value={newName}
              onChangeText={setNewName}
              maxLength={60}
              editable={!saving}
            />

            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>{t("Tipo de cuenta")}</Text>
            <View style={styles.chipsRow}>
              {(Object.keys(accountKinds) as AccountKind[]).map(k => (
                <Pressable
                  key={k}
                  onPress={() => setNewKind(k)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: newKind === k ? colors.primary : colors.surfaceSubtle,
                      borderColor: newKind === k ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: newKind === k ? colors.onPrimary : colors.text }]}>
                    {t(accountKinds[k])}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>{t("Moneda")}</Text>
            <View style={styles.chipsRow}>
              {currencies.map(curr => (
                <Pressable
                  key={curr}
                  onPress={() => setNewCurrency(curr)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: newCurrency === curr ? colors.primary : colors.surfaceSubtle,
                      borderColor: newCurrency === curr ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: newCurrency === curr ? colors.onPrimary : colors.text }]}>
                    {curr}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>{t("Saldo de apertura")}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.tertiaryText}
              keyboardType="numbers-and-punctuation"
              value={newOpening}
              onChangeText={setNewOpening}
              editable={!saving}
            />

            {newKind === 'credit_card' && <BudgetField value={newBudget} currency={newCurrency}
              onChange={setNewBudget} disabled={saving} />}
            {newKind === 'credit_card' && <CardCycleFields value={newCycle}
              onChange={setNewCycle} disabled={saving} />}
            <AccountColorField value={newColor} onChange={setNewColor} disabled={saving} />

            {!!error && (
              <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
            )}

            <View style={styles.formBtnRow}>
              <Pressable
                onPress={handleCreateAccount}
                disabled={saving}
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.submitBtnText, { color: colors.onPrimary }]}>
                  {saving ? t("Guardando...") : t("Crear cuenta")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setIsCreating(false); setError(''); }}
                disabled={saving}
                style={styles.cancelBtn}
              >
                <Text style={[styles.cancelBtnText, { color: colors.secondaryText }]}>{t("Cancelar")}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Accounts Carousel (Referencia 4) */}
        {accountsError ? (
          <View style={{ gap: spacing.sm, padding: spacing.page }}>
            <Text accessibilityRole="alert" style={{ color: colors.expense }}>{t(accountsError)}</Text>
            <Pill label={t("Reintentar")} onPress={() => { void refreshAccounts(); }} />
          </View>
        ) : accounts === null ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : accounts.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="wallet-outline" size={48} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("Aún no tienes cuentas registradas")}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
              {t("Crea tu primera cuenta para comenzar a registrar tus finanzas personales.")}
            </Text>
            <Pressable
              onPress={() => setIsCreating(true)}
              style={[styles.createFirstBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.createFirstBtnText, { color: colors.onPrimary }]}>{t("+ Crear mi primera cuenta")}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.carouselSection}>
            <FlatList
              horizontal
              data={accounts}
              keyExtractor={item => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContainer}
              snapToInterval={302}
              decelerationRate="fast"
              onScroll={onCardScroll}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <View style={styles.cardWrapper}>
                  <AccountCard account={item} variant="carousel" />
                </View>
              )}
            />

            {/* Pagination Dots (Referencia 4) */}
            {accounts.length > 1 && (
              <View style={styles.dotsRow}>
                {accounts.map((acc, idx) => (
                  <View
                    key={acc.id}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: idx === activeIndex ? colors.primary : colors.border,
                        width: idx === activeIndex ? 18 : 6,
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Quick Actions for active account */}
            {activeAccount && (
              <View style={styles.quickActionsRow}>
                <Pressable
                  onPress={() => startEdit(activeAccount)}
                  style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, borderWidth: 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar cuenta ${activeAccount.name}`}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>{t("Editar cuenta")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/add')}
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="add" size={18} color={colors.onPrimary} style={{ marginRight: 2 }} />
                  <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>{t("Movimiento")}</Text>
                </Pressable>
              </View>
            )}

            {activeAccount?.kind === 'credit_card' && <>
              <View style={{ padding: spacing.md, gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.card }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('Ciclo de facturación')}</Text>
                <Text style={{ color: colors.secondaryText }}>
                  {t('Día de corte')} · {activeAccount.statementDay ?? '—'}
                </Text>
                <Text style={{ color: colors.secondaryText }}>
                  {t('Día de pago')} · {activeAccount.paymentDay ?? '—'}
                </Text>
                {cycle && <Text style={{ color: colors.secondaryText }}>
                  {t('Corte y pago estimados del ciclo')} · {cycle.statement} / {cycle.payment}
                </Text>}
              </View>
              <Pill label={t('Ver detalle de tarjeta · Ejemplo')} onPress={() => setCardPreview(true)} />
              {cardPreview && <InstallmentPreview example principal={120000000} currency="COP"
                purchaseDate="2026-11-20" accountName={t('Tarjeta de ejemplo')} onClose={() => setCardPreview(false)} />}
            </>}
            {/* Active Account Movements List */}
            <View style={styles.movementsSection}>
              <View style={styles.movementsHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("Movimientos ·")} {activeAccount?.name}
                </Text>
                <Text style={[styles.sectionCount, { color: colors.secondaryText }]}>
                  {activeAccountMovements.length} {activeAccountMovements.length === 1 ? 'registro' : 'registros'}
                </Text>
              </View>

              {movementsFailed ? (
                <View style={{ gap: spacing.sm }}>
                  <Text accessibilityRole="alert" style={{ color: colors.expense }}>{t("No se pudo cargar el historial.")}</Text>
                  <Pill label={t("Reintentar")} onPress={() => { void refreshAccounts(); }} />
                </View>
              ) : loadingMovements ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
              ) : activeAccountMovements.length === 0 ? (
                <View style={[styles.emptyAccountBox, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.emptyAccountText, { color: colors.secondaryText }]}>
                    {t("No hay movimientos registrados en esta cuenta.")}
                  </Text>
                </View>
              ) : (
                <View style={[styles.movementsListCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {activeAccountMovements.map(mov => (
                    <TransactionRow
                      key={mov.id}
                      movement={mov}
                      currency={activeAccount?.currency}
                      showDate
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Edit Account Modal */}
      <Modal
        visible={editingAccount !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingAccount(null)}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled" style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t("Editar cuenta")}</Text>
              <Pressable onPress={() => setEditingAccount(null)}>
                <Ionicons name="close" size={22} color={colors.secondaryText} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>{t("Nombre de la cuenta")}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
              value={editName}
              onChangeText={setEditName}
              maxLength={60}
              editable={!saving}
            />

            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>{t("Tipo de cuenta")}</Text>
            <View style={styles.chipsRow}>
              {(Object.keys(accountKinds) as AccountKind[]).map(k => (
                <Pressable
                  key={k}
                  onPress={() => setEditKind(k)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: editKind === k ? colors.primary : colors.surfaceSubtle,
                      borderColor: editKind === k ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: editKind === k ? colors.onPrimary : colors.text }]}>
                    {t(accountKinds[k])}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>{t("Moneda")}</Text>
            <View style={styles.chipsRow}>
              {currencies.map(curr => (
                <Pressable
                  key={curr}
                  onPress={() => setEditCurrency(curr)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: editCurrency === curr ? colors.primary : colors.surfaceSubtle,
                      borderColor: editCurrency === curr ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: editCurrency === curr ? colors.onPrimary : colors.text }]}>
                    {curr}
                  </Text>
                </Pressable>
              ))}
            </View>

            {editKind === 'credit_card' && <BudgetField value={editBudget} currency={editCurrency}
              onChange={setEditBudget} disabled={saving} />}
            {editKind === 'credit_card' && <CardCycleFields value={editCycle}
              onChange={setEditCycle} disabled={saving} />}
            <AccountColorField value={editColor} onChange={setEditColor} disabled={saving} />

            {!!error && (
              <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => {
                  if (editingAccount) {
                    Alert.alert(
                      t("Eliminar cuenta"),
                      t("¿Eliminar la cuenta y todos sus movimientos?") + ` (${editingAccount.name})`,
                      [
                        { text: t("Cancelar"), style: 'cancel' },
                        {
                          text: t("Eliminar"),
                          style: 'destructive',
                          onPress: () => void handleDeleteAccount(editingAccount),
                        },
                      ]
                    );
                  }
                }}
                disabled={saving}
                style={[styles.deleteBtn, { backgroundColor: colors.expenseLight }]}
              >
                <Text style={[styles.deleteBtnText, { color: colors.expense }]}>{t("Eliminar")}</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveAccountEdit}
                disabled={saving}
                style={[styles.saveEditBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.saveEditBtnText, { color: colors.onPrimary }]}>
                  {saving ? t("Guardando...") : t("Guardar")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.page,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  manageCatBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  manageCatText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addBtn: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 8,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  createCard: {
    padding: spacing.lg,
    borderRadius: radius.cardLg,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  createTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  textInput: {
    minHeight: 44,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    marginTop: 4,
  },
  formBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  submitBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  carouselSection: {
    gap: spacing.md,
  },
  carouselContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  cardWrapper: {
    width: 290,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  movementsSection: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  movementsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyAccountBox: {
    padding: spacing.xl,
    borderRadius: radius.card,
    alignItems: 'center',
  },
  emptyAccountText: {
    fontSize: 14,
  },
  movementsListCard: {
    borderRadius: radius.cardLg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  emptyBox: {
    padding: spacing.xxl,
    borderRadius: radius.cardLg,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  createFirstBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  createFirstBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.page,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    flexGrow: 0,
    flexShrink: 1,
    borderRadius: radius.cardLg,
    borderWidth: 1,
  },
  modalContent: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  deleteBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveEditBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  saveEditBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
