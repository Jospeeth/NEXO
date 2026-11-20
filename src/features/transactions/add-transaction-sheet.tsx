import { cardCycleDates } from '../accounts/card-cycle';
import { InstallmentPreview } from '../installments/installment-preview';
import { useLanguage } from '../../shared/language/language';
import { DatePicker, Pill } from '../../shared/ui/date-controls';
import { localDay } from '../../shared/date/local-day';
import { parseOpening } from '../accounts/account';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { createAccount, loadAccounts } from '../accounts/repository';
import { loadCategories } from '../categories/repository';
import { recordMovement, updateMovement, type MovementKind, type Movement } from './repository';
import type { SavedAccount } from '../accounts/account';
import type { Category } from '../categories/category';

interface AddTransactionSheetProps {
  onDismiss: () => void;
  onSuccess?: () => void;
  initial?: Movement;
  onTransfer?: () => void;
}

export function AddTransactionSheet({
  onDismiss,
  onSuccess,
  initial,
  onTransfer,
}: AddTransactionSheetProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  // 1. Type: Income or Expense
  const [kind, setKind] = useState<MovementKind>(initial?.kind ?? 'expense');

  // 2. Amount: Visual Protagonist
  const [amountText, setAmountText] = useState(initial ? String(initial.amountMinor / 100) : '');

  // 3. Description (optional)
  const [description, setDescription] = useState(initial?.note ?? '');

  // 4. Account (mandatory)
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(initial?.accountId ?? null);

  // Quick account creation inside sheet if user has no accounts
  const [creatingQuickAccount, setCreatingQuickAccount] = useState(false);
  const [quickAccountName, setQuickAccountName] = useState('');

  // 5. Category (optional, defaults to "No category" / null)
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(initial?.categoryId ?? null);

  // 6. Date (defaults to today)
  const [transactionDate, setTransactionDate] = useState(initial?.transactionDate ?? localDay());

  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [initialFailed, setInitialFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [accs, cats] = await Promise.all([
          loadAccounts(),
          loadCategories(),
        ]);
        if (mounted) {
          setAccounts(accs);
          if (accs.length > 0 && accs[0]) {
            setSelectedAccountId(initial?.accountId ?? accs[0].id);
          }
          setCategories(cats);
        }
      } catch {
        if (mounted) setInitialFailed(true);
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    }
    void loadData();
    return () => { mounted = false; };
  }, [initial?.accountId, loadAttempt]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const principal = parseOpening(amountText) ?? 0;
  const showInstallments = kind === 'expense' && selectedAccount?.kind === 'credit_card';
  const filteredCategories = categories.filter(c => c.kind === kind || c.kind === 'both');

  async function handleQuickCreateAccount() {
    if (!quickAccountName.trim()) {
      setError(t("Escribe un nombre para la nueva cuenta."));
      return;
    }
    setError('');
    try {
      const newId = await createAccount({
        name: quickAccountName.trim(),
        kind: 'checking',
        currency: 'COP',
        openingMinor: 0,
      });
      const updated = await loadAccounts();
      setAccounts(updated);
      setSelectedAccountId(newId);
      setCreatingQuickAccount(false);
      setQuickAccountName('');
    } catch {
      setError(t("No se pudo crear la cuenta rápida."));
    }
  }

  async function handleSave() {
    if (saving) return;

    const minor = parseOpening(amountText);
    if (minor === null || minor <= 0) {
      setError(t("Introduce un importe válido mayor que cero (ej. 25.00)."));
      return;
    }

    if (!selectedAccountId || !selectedAccount) {
      setError(t("Debes seleccionar o crear una cuenta para registrar el movimiento."));
      return;
    }

    const originalAccount = accounts.find(account => account.id === initial?.accountId);
    if (originalAccount && selectedAccount.currency !== originalAccount.currency) {
      setError(t("Elige una cuenta con la misma moneda que el movimiento original."));
      return;
    }

    setSaving(true);
    setError('');

    try {
      const input = {
        kind,
        amountMinor: minor,
        note: description.trim(),
        categoryId: selectedCategoryId,
        transactionDate,
      };
      if (initial) await updateMovement(initial.id, selectedAccountId, input);
      else await recordMovement(selectedAccountId, input);

      onSuccess?.();
      onDismiss();
    } catch {
      setError(t("Error al guardar el movimiento. Por favor inténtalo de nuevo."));
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Title and Close Button */}
          <View style={styles.sheetHeader}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
            <View style={styles.titleRow}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {initial ? t("Editar transacción") : t("Nueva transacción")}
              </Text>
              <Pressable
                onPress={onDismiss}
                style={[styles.closeButton, { backgroundColor: colors.surfaceSubtle }]}
                accessibilityRole="button"
                accessibilityLabel={t("Cerrar formulario")}
              >
                <Ionicons name="close" size={20} color={colors.secondaryText} />
              </Pressable>
            </View>
          </View>

          {onTransfer && <Pill label={t('Transferencia interna')} onPress={onTransfer} />}

          {loadingInitial ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xxl }} />
          ) : initialFailed ? (
            <View style={{ gap: spacing.sm }}>
              <Text accessibilityRole="alert" style={{ color: colors.expense }}>{t("No se pudieron cargar los datos.")}</Text>
              <Pill label={t("Reintentar")} onPress={() => {
                setInitialFailed(false);
                setLoadingInitial(true);
                setLoadAttempt(value => value + 1);
              }} />
            </View>
          ) : (
            <>
              {/* STEP 1: Income / Expense Segmented Control */}
              <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Pressable
                  onPress={() => { if (kind !== 'expense') setSelectedCategoryId(null); setKind('expense'); }}
                  style={[
                    styles.segmentItem,
                    kind === 'expense' && [
                      styles.segmentItemSelected,
                      { backgroundColor: colors.surface, shadowColor: colors.text },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: kind === 'expense' ? colors.expense : colors.secondaryText },
                      kind === 'expense' && styles.segmentTextSelected,
                    ]}
                  >
                    {t("↓ Gasto")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => { if (kind !== 'income') setSelectedCategoryId(null); setKind('income'); }}
                  style={[
                    styles.segmentItem,
                    kind === 'income' && [
                      styles.segmentItemSelected,
                      { backgroundColor: colors.surface, shadowColor: colors.text },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: kind === 'income' ? colors.income : colors.secondaryText },
                      kind === 'income' && styles.segmentTextSelected,
                    ]}
                  >
                    {t("↑ Ingreso")}
                  </Text>
                </Pressable>
              </View>

              {/* STEP 2: Amount (PROTAGONIST VISUAL) */}
              <View style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                <Text style={[styles.amountLabel, { color: colors.secondaryText }]}>
                  {t("IMPORTE ·")} {selectedAccount?.currency ?? 'USD / COP'}
                </Text>
                <View style={styles.amountInputRow}>
                  <Text style={[styles.currencyPrefix, { color: kind === 'income' ? colors.income : colors.expense }]}>
                    {kind === 'income' ? '+$' : '−$'}
                  </Text>
                  <TextInput
                    style={[
                      styles.amountInput,
                      { color: colors.text },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={colors.tertiaryText}
                    keyboardType="decimal-pad"
                    value={amountText}
                    onChangeText={text => {
                      setAmountText(text);
                      if (error) setError('');
                    }}
                    editable={!saving}
                    accessibilityLabel={t("Importe de la transacción")}
                  />
                </View>
              </View>

              {/* STEP 3: Description (optional) */}
              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>
                  {t("DESCRIPCIÓN (OPCIONAL)")}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="What was this for?"
                  placeholderTextColor={colors.tertiaryText}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={120}
                  editable={!saving}
                  accessibilityLabel={t("Descripción de la transacción")}
                />
              </View>

              {/* STEP 4: Select Account (MANDATORY) */}
              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>
                  {t("SELECCIONA CUENTA *")}
                </Text>

                {accounts.length === 0 ? (
                  <View style={[styles.noAccountBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.noAccountText, { color: colors.secondaryText }]}>
                      {t("No tienes cuentas creadas.")}
                    </Text>
                    {creatingQuickAccount ? (
                      <View style={{ gap: spacing.sm, width: '100%', marginTop: spacing.xs }}>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.primary, color: colors.text }]}
                          placeholder={t("Nombre de la cuenta (ej. Principal)")}
                          placeholderTextColor={colors.tertiaryText}
                          value={quickAccountName}
                          onChangeText={setQuickAccountName}
                        />
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                          <Pressable
                            onPress={handleQuickCreateAccount}
                            style={[styles.quickAccBtn, { backgroundColor: colors.primary }]}
                          >
                            <Text style={[styles.quickAccBtnText, { color: colors.onPrimary }]}>{t("Guardar cuenta")}</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => setCreatingQuickAccount(false)}
                            style={styles.cancelQuickBtn}
                          >
                            <Text style={{ color: colors.secondaryText, fontSize: 13 }}>{t("Cancelar")}</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => setCreatingQuickAccount(true)}
                        style={[styles.createAccPromptBtn, { backgroundColor: colors.primary }]}
                      >
                        <Text style={[styles.createAccPromptText, { color: colors.onPrimary }]}>
                          {t("+ Crear cuenta ahora")}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalSelector}
                  >
                    {accounts.map(account => {
                      const isSelected = account.id === selectedAccountId;
                      return (
                        <Pressable
                          key={account.id}
                          onPress={() => {
                            setSelectedAccountId(account.id);
                            if (error) setError('');
                          }}
                          style={[
                            styles.accountPill,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.surface,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: isSelected }}
                        >
                          <Text
                            style={[
                              styles.accountPillName,
                              { color: isSelected ? colors.onPrimary : colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {account.name}
                          </Text>
                          <Text
                            style={[
                              styles.accountPillCurrency,
                              { color: isSelected ? 'rgba(255,255,255,0.85)' : colors.secondaryText },
                            ]}
                          >
                            {account.currency}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {showInstallments && selectedAccount && (
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{t('Detalles de cuotas')}</Text>
                  <Pill label={t('Simular compra a cuotas')} disabled={principal <= 0} onPress={() => setPreview(true)} />
                  {principal <= 0 && <Text style={{ color: colors.secondaryText }}>{t('Ingresa el importe para simular las cuotas.')}</Text>}
                  {preview && <InstallmentPreview principal={principal} currency={selectedAccount.currency}
                    purchaseDate={transactionDate}
                    firstDueDate={selectedAccount.statementDay && selectedAccount.paymentDay
                      ? cardCycleDates(transactionDate, selectedAccount.statementDay, selectedAccount.paymentDay).payment : undefined}
                    onClose={() => setPreview(false)} />}
                </View>
              )}
              {/* STEP 5: Select Category (EMOJIS) */}
              <View style={styles.formSection}>
                <View style={styles.labelRowWithAction}>
                  <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>
                    {t("CATEGORÍA")}
                  </Text>
                  {selectedCategoryId !== null && (
                    <Pressable onPress={() => setSelectedCategoryId(null)}>
                      <Text style={[styles.clearAction, { color: colors.primary }]}>
                        {t("Restablecer (Sin categoría)")}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Category Chips with Emojis */}
                <View style={styles.categoryWrap}>
                  {/* Default "Sin categoría" option */}
                  <Pressable
                    onPress={() => setSelectedCategoryId(null)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selectedCategoryId === null ? colors.lavender : colors.surface,
                        borderColor: selectedCategoryId === null ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.categoryChipEmoji}>📦</Text>
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: selectedCategoryId === null ? colors.primary : colors.text },
                      ]}
                    >
                      {t("Sin categoría")}
                    </Text>
                  </Pressable>

                  {filteredCategories.map(cat => {
                    const isSelected = cat.id === selectedCategoryId;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setSelectedCategoryId(cat.id)}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected ? colors.lavender : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: isSelected ? colors.primary : colors.text },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Date Selector Row */}
              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>
                  {t("FECHA")}
                </Text>
                <DatePicker value={transactionDate} onChange={setTransactionDate} />
              </View>

              {/* Error Alert Box */}
              {!!error && (
                <View style={[styles.errorBox, { backgroundColor: colors.expenseLight }]}>
                  <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
                </View>
              )}

              {/* STEP 6: Save Button */}
              <View style={styles.buttonContainer}>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.saveButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: saving ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={initial ? t("Guardar cambios") : kind === "income" ? t("Añadir ingreso") : t("Añadir gasto")}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>
                      {initial ? t("Guardar cambios") : kind === "income" ? t("Añadir ingreso") : t("Añadir gasto")}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={onDismiss}
                  disabled={saving}
                  style={styles.cancelButton}
                  accessibilityRole="button"
                  accessibilityLabel={t("Cancelar")}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.secondaryText }]}>
                    {t("Cancelar")}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.page,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  sheetHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  titleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmentItemSelected: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
  },
  segmentTextSelected: {
    fontWeight: '700',
  },
  amountCard: {
    padding: spacing.lg,
    borderRadius: radius.cardLg,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: spacing.xs,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPrefix: {
    fontSize: 34,
    fontWeight: '700',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 140,
    textAlign: 'center',
  },
  formSection: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 2,
  },
  labelRowWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearAction: {
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    minHeight: 48,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  noAccountBox: {
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  noAccountText: {
    fontSize: 13,
  },
  createAccPromptBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  createAccPromptText: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickAccBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  quickAccBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cancelQuickBtn: {
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  horizontalSelector: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  accountPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountPillName: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountPillCurrency: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  dateValueText: {
    fontSize: 15,
    fontWeight: '500',
  },
  dateQuickButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  dateQuickBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  dateQuickText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.card,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
