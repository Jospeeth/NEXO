import { BackupSection } from '../backup/backup-section';
import { ExchangeRateCard } from '../exchange/rate-card';
import { ImportSection } from '../import/import-section';

import { useLanguage } from '../../shared/language/language';
import { BudgetField } from '../../shared/ui/budget-field';
import { displayBalance, parseOpening, type Currency } from '../accounts/account';
import { ExportSection } from './export-section';
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppearanceSettings, type AppearancePreference } from '../../shared/theme/appearance';
import { radius, spacing, useTheme } from '../../shared/theme/theme';
import { loadCategories, updateCategory, createCategory, deleteCategory } from '../categories/repository';
import type { Category, CategoryKind } from '../categories/category';

const appearanceOptions: { value: AppearancePreference; label: string }[] = [
  { value: 'auto', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { t, language, ready: languageReady, saving: savingLanguage, change: changeLanguage, error: languageError } = useLanguage();
  const { colors } = useTheme();
  const { preference, ready, saving: savingAppearance, error: appearanceError, change } = useAppearanceSettings();

  const { glassEnabled, glassReady, glassError, glassKind, changeGlass } = useAppearanceSettings();

  const [categories, setCategories] = useState<Category[]>([]);

  // Edit category modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editedEmoji, setEditedEmoji] = useState('');
  const [editedName, setEditedName] = useState('');
  const [editedBudget, setEditedBudget] = useState('');
  const [editedBudgetCurrency, setEditedBudgetCurrency] = useState<Currency>('COP');
  const [editedKind, setEditedKind] = useState<CategoryKind>('expense');

  // New category modal state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newEmoji, setNewEmoji] = useState('🏷️');
  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newBudgetCurrency, setNewBudgetCurrency] = useState<Currency>('COP');
  const [newKind, setNewKind] = useState<CategoryKind>('expense');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refreshCategories = useCallback(async () => {
    try {
      const cats = await loadCategories();
      setCategories(cats);
    } catch {
      // retain state
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshCategories();
    }, [refreshCategories])
  );

  function startEdit(cat: Category) {
    setEditingCategory(cat);
    setEditedEmoji(cat.emoji);
    setEditedName(cat.name);
    setEditedKind(cat.kind);
    setEditedBudget(cat.budgetMinor == null ? '' : String(cat.budgetMinor / 100));
    setEditedBudgetCurrency(cat.budgetCurrency ?? 'COP');
    setError('');
  }

  async function saveCategoryEdit() {
    if (!editingCategory) return;
    if (!editedEmoji.trim() || !editedName.trim()) {
      setError(t("El emoji y el nombre son requeridos."));
      return;
    }

    if (saving) return;
    const budgetMinor = editedBudget.trim() ? parseOpening(editedBudget) : null;
    if (editedBudget.trim() && (budgetMinor === null || budgetMinor <= 0)) {
      setError(t("Ingresa un presupuesto mensual mayor que cero."));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateCategory(editingCategory.id, {
        emoji: editedEmoji.trim(),
        name: editedName.trim(),
        kind: editedKind,
        budgetMinor,
        budgetCurrency: budgetMinor === null ? null : editedBudgetCurrency,
      });
      setEditingCategory(null);
      await refreshCategories();
    } catch {
      setError(t("No se pudo actualizar la categoría."));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCategory() {
    if (!newEmoji.trim() || !newName.trim()) {
      setError(t("El emoji y el nombre son requeridos."));
      return;
    }

    if (saving) return;
    const budgetMinor = newBudget.trim() ? parseOpening(newBudget) : null;
    if (newBudget.trim() && (budgetMinor === null || budgetMinor <= 0)) {
      setError(t("Ingresa un presupuesto mensual mayor que cero."));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createCategory({
        emoji: newEmoji.trim(),
        name: newName.trim(),
        kind: newKind,
        budgetMinor,
        budgetCurrency: budgetMinor === null ? null : newBudgetCurrency,
      });
      setIsCreatingCategory(false);
      setNewName('');
      setNewBudget('');
      setNewBudgetCurrency('COP');
      setNewEmoji('🏷️');
      await refreshCategories();
    } catch {
      setError(t("No se pudo crear la categoría."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(cat: Category) {
    setSaving(true);
    try {
      await deleteCategory(cat.id);
      setEditingCategory(null);
      await refreshCategories();
    } catch {
      setError(t("No se pudo eliminar la categoría."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.primary }]}>{t("CONFIGURACIÓN")}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t("Ajustes")}</Text>
        </View>

        {/* System Appearance Group */}
        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.secondaryText }]}>APPEARANCE</Text>
          <View style={[styles.groupedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View accessibilityRole="radiogroup" accessibilityLabel="Appearance"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.xs }}>
              {appearanceOptions.map(({ value, label }) => {
                const selected = preference === value;
                return (
                  <Pressable key={value} accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: !ready || savingAppearance }}
                    disabled={!ready || savingAppearance} onPress={() => { void change(value); }}
                    style={({ pressed }) => ({
                      flexGrow: 1, minHeight: 44, paddingHorizontal: spacing.md,
                      alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm,
                      backgroundColor: selected ? colors.primary : pressed ? colors.selected : colors.surfaceSubtle,
                    })}>
                    <Text style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: '600' }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
              {appearanceError && <Text accessibilityRole="alert" style={{ color: colors.expense }}>{t(appearanceError)}</Text>}
            </View>
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.row}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={[styles.rowText, { color: colors.text }]}>Liquid Glass</Text>
                <Text style={[styles.rowValue, { color: colors.secondaryText }]}>
                  {t(!glassEnabled ? 'Desactivado' : glassKind === 'native' ? 'Efecto nativo de iOS'
                    : glassKind === 'blur' ? 'Desenfoque de compatibilidad' : 'Transparencia reducida')}
                </Text>
              </View>
              <Switch accessibilityLabel="Liquid Glass" value={glassEnabled} disabled={!glassReady}
                trackColor={{ true: colors.primary }} onValueChange={value => { void changeGlass(value); }} />
            </View>
            {glassError && <Text accessibilityRole="alert" style={{ padding: spacing.md, color: colors.expense }}>
              {t('No se pudo cargar o guardar el efecto visual.')}
            </Text>}
          </View>
        </View>

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.secondaryText }]}>LANGUAGE</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Language"
            style={[styles.groupedCard, { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.xs,
              gap: spacing.xs, backgroundColor: colors.surface, borderColor: colors.border }]}>
            {([{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }] as const).map(({ value, label }) => (
              <Pressable key={value} accessibilityRole="radio"
                accessibilityState={{ checked: language === value, disabled: !languageReady || savingLanguage }}
                disabled={!languageReady || savingLanguage} onPress={() => { void changeLanguage(value); }}
                style={({ pressed }) => ({
                  flexGrow: 1, minHeight: 44, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center',
                  borderRadius: radius.sm, backgroundColor: language === value ? colors.primary : pressed ? colors.selected : colors.surfaceSubtle,
                })}>
                <Text style={{ color: language === value ? colors.onPrimary : colors.text, fontWeight: '600' }}>{label}</Text>
              </Pressable>
            ))}
            {languageError && <Text accessibilityRole="alert" style={{ color: colors.expense }}>
              {language === 'en' ? 'Could not load or save your language preference.' : 'No se pudo cargar o guardar tu idioma.'}
            </Text>}
          </View>
        </View>

        <ExchangeRateCard />
        <ExportSection />
        <BackupSection onRestored={refreshCategories} />
        <ImportSection onImported={refreshCategories} />

        {/* Categories Management (Edición de categorías con EMOJIS) */}
        <View style={styles.group}>
          <View style={styles.groupHeaderRow}>
            <Text style={[styles.groupTitle, { color: colors.secondaryText }]}>
              {t("CATEGORÍAS Y EMOJIS")}
            </Text>
            <Pressable
              onPress={() => { setIsCreatingCategory(true); setError(''); }}
              style={[styles.addCatBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={t("Crear categoría")}
            >
              <Ionicons name="add" size={14} color={colors.onPrimary} style={{ marginRight: 2 }} />
              <Text style={[styles.addCatBtnText, { color: colors.onPrimary }]}>{t("Nueva")}</Text>
            </Pressable>
          </View>

          <View style={[styles.groupedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {categories.map((cat, idx) => (
              <React.Fragment key={cat.id}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />}
                <Pressable
                  onPress={() => startEdit(cat)}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: pressed ? colors.surfaceSubtle : 'transparent' },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("Editar categoría")} ${cat.name}`}
                >
                  <View style={styles.rowLabelGroup}>
                    <View style={[styles.emojiBadge, { backgroundColor: colors.lavender }]}>
                      <Text style={styles.emojiText}>{cat.emoji}</Text>
                    </View>
                    <View>
                      <Text style={[styles.rowText, { color: colors.text }]}>{cat.name}</Text>
                      <Text style={[styles.catKindText, { color: colors.secondaryText }]}>
                        {cat.kind === 'income' ? t("Ingreso") : cat.kind === 'expense' ? t("Gasto") : t("General")}
                      </Text>
                      {cat.budgetMinor != null && cat.budgetCurrency && (
                        <Text style={[styles.catKindText, { color: colors.secondaryText }]}>
                          {cat.kind === 'income' ? t("Recibido este mes") : t("Gastado este mes")}: {displayBalance({
                            currency: cat.budgetCurrency, openingMinor: cat.monthActualMinor ?? 0,
                          })} / {displayBalance({ currency: cat.budgetCurrency, openingMinor: cat.budgetMinor })}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.tertiaryText} />
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Security & Financial Privacy Group */}
        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.secondaryText }]}>
            {t("SEGURIDAD Y PRIVACIDAD")}
          </Text>
          <View style={[styles.groupedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={styles.rowLabelGroup}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.income} />
                <Text style={[styles.rowText, { color: colors.text }]}>{t("Cifrado local")}</Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.income }]}>{t("SQLCipher activo")}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.row}>
              <View style={styles.rowLabelGroup}>
                <Ionicons name="key-outline" size={20} color={colors.primary} />
                <Text style={[styles.rowText, { color: colors.text }]}>{t("Clave de seguridad")}</Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.secondaryText }]}>iOS Keychain</Text>
            </View>
          </View>
        </View>

        {/* App Version Info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.tertiaryText }]}>
            {t("NEXO Finanzas Personales · v0.1.0")}
          </Text>
        </View>
      </ScrollView>

      {/* Edit Category Modal */}
      <Modal
        visible={editingCategory !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCategory(null)}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled" style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t("Editar categoría")}</Text>
              <Pressable onPress={() => setEditingCategory(null)}>
                <Ionicons name="close" size={22} color={colors.secondaryText} />
              </Pressable>
            </View>

            <Text style={[styles.modalLabel, { color: colors.secondaryText }]}>Emoji</Text>
            <TextInput
              style={[styles.modalInput, styles.emojiInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
              value={editedEmoji}
              onChangeText={setEditedEmoji}
              maxLength={4}
            />

            <Text style={[styles.modalLabel, { color: colors.secondaryText }]}>{t("Nombre")}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
              value={editedName}
              onChangeText={setEditedName}
              maxLength={40}
            />

            <Text style={[styles.modalLabel, { color: colors.secondaryText }]}>{t("Tipo")}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {(['expense', 'income', 'both'] as CategoryKind[]).map(k => (
                <Pressable
                  key={k}
                  onPress={() => setEditedKind(k)}
                  style={[
                    styles.kindChip,
                    {
                      backgroundColor: editedKind === k ? colors.primary : colors.surfaceSubtle,
                      borderColor: editedKind === k ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: editedKind === k ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '600' }}>
                    {k === 'expense' ? t("Gasto") : k === 'income' ? t("Ingreso") : t("Ambos")}
                  </Text>
                </Pressable>
              ))}
            </View>

            <BudgetField value={editedBudget} currency={editedBudgetCurrency} onChange={setEditedBudget}
              onCurrencyChange={setEditedBudgetCurrency} income={editedKind === 'income'} disabled={saving} />

            {!!error && (
              <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => {
                  if (editingCategory) {
                    Alert.alert(
                      t("Eliminar categoría"),
                      t("¿Eliminar la categoría?") + ` (${editingCategory.name})`,
                      [
                        { text: t("Cancelar"), style: 'cancel' },
                        { text: t("Eliminar"), style: 'destructive', onPress: () => void handleDeleteCategory(editingCategory) },
                      ]
                    );
                  }
                }}
                disabled={saving}
                style={[styles.deleteCatBtn, { backgroundColor: colors.expenseLight }]}
              >
                <Text style={{ color: colors.expense, fontWeight: '700', fontSize: 13 }}>{t("Eliminar")}</Text>
              </Pressable>

              <Pressable
                onPress={saveCategoryEdit}
                disabled={saving}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>
                  {saving ? t("Guardando...") : t("Guardar")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Category Modal */}
      <Modal
        visible={isCreatingCategory}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreatingCategory(false)}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled" style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t("Nueva categoría")}</Text>
              <Pressable onPress={() => setIsCreatingCategory(false)}>
                <Ionicons name="close" size={22} color={colors.secondaryText} />
              </Pressable>
            </View>

            <Text style={[styles.modalLabel, { color: colors.secondaryText }]}>Emoji</Text>
            <TextInput
              style={[styles.modalInput, styles.emojiInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
              value={newEmoji}
              onChangeText={setNewEmoji}
              maxLength={4}
            />

            <Text style={[styles.modalLabel, { color: colors.secondaryText }]}>{t("Nombre")}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
              placeholder={t("Ej. Gimnasio, Mascotas...")}
              placeholderTextColor={colors.tertiaryText}
              value={newName}
              onChangeText={setNewName}
              maxLength={40}
            />

            <Text style={[styles.modalLabel, { color: colors.secondaryText }]}>{t("Tipo")}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {(['expense', 'income', 'both'] as CategoryKind[]).map(k => (
                <Pressable
                  key={k}
                  onPress={() => setNewKind(k)}
                  style={[
                    styles.kindChip,
                    {
                      backgroundColor: newKind === k ? colors.primary : colors.surfaceSubtle,
                      borderColor: newKind === k ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: newKind === k ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '600' }}>
                    {k === 'expense' ? t("Gasto") : k === 'income' ? t("Ingreso") : t("Ambos")}
                  </Text>
                </Pressable>
              ))}
            </View>

            <BudgetField value={newBudget} currency={newBudgetCurrency} onChange={setNewBudget}
              onCurrencyChange={setNewBudgetCurrency} income={newKind === 'income'} disabled={saving} />

            {!!error && (
              <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setIsCreatingCategory(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={[styles.modalCancelText, { color: colors.secondaryText }]}>{t("Cancelar")}</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateCategory}
                disabled={saving}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>
                  {saving ? t("Creando...") : t("Crear")}
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
    gap: spacing.xl,
  },
  header: {
    gap: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  group: {
    gap: spacing.xs + 2,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  addCatBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCatBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  groupedCard: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  rowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 28,
  },
  emojiBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 18,
  },
  catKindText: {
    fontSize: 11,
    marginTop: 1,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    marginVertical: spacing.md,
  },
  footerText: {
    fontSize: 12,
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
    maxWidth: 340,
    borderRadius: radius.cardLg,
    borderWidth: 1,
    flexGrow: 0,
    flexShrink: 1,
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
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalInput: {
    minHeight: 44,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  emojiInput: {
    fontSize: 24,
    textAlign: 'center',
    width: 70,
    alignSelf: 'center',
  },
  kindChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  deleteCatBtn: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  modalSaveBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
