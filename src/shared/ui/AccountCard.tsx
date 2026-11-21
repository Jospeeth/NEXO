import { MetallicSheen } from '../../features/accounts/metallic-sheen';
import { metallicFinishes, readCardProfile } from '../../features/accounts/card-profile';
import { InstitutionMark } from '../../features/accounts/institution-mark';
import { useLanguage } from '../language/language';
import { accountColorGradient, normalizeAccountColor } from '../../features/accounts/account-color';
import React from 'react';
import { StyleSheet, Text, View, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cardShadow, radius, spacing, useTheme } from '../theme/theme';
import { accountKinds, displayBalance, type SavedAccount } from '../../features/accounts/account';

interface AccountCardProps {
  account: SavedAccount;
  onPress?: () => void;
  variant?: 'hero' | 'carousel' | 'compact';
  style?: StyleProp<ViewStyle>;
  equivalent?: string;
  period?: { balanceMinor: number | null };
}

export function AccountCard({
  account,
  onPress,
  variant = 'carousel',
  style,
  period,
  equivalent,
}: AccountCardProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const formattedBalance = period?.balanceMinor === null ? t("Saldo histórico no disponible") : displayBalance({
    currency: account.currency,
    openingMinor: period?.balanceMinor ?? account.balanceMinor,
  });

  const custom = normalizeAccountColor(account.color ?? '');
  const profile = readCardProfile(account.cardProfile);
  const finish = profile.finish ? metallicFinishes[profile.finish] : null;
  const gradient = finish ? [finish[2], finish[3], finish[2]] as const
    : custom ? accountColorGradient(custom) : [colors.cardGradientStart, colors.cardGradientEnd] as const;
  const institution = profile.institution;
  const kindLabel = t(accountKinds[account.kind] ?? account.kind);

  if (variant === 'compact') {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.compactContainer,
          {
            overflow: 'hidden',
            borderColor: colors.border,
            opacity: pressed ? 0.9 : 1,
          },
          style,
        ]}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={`${t("Cuenta")} ${account.name}, ${kindLabel}, ${t("saldo")} ${formattedBalance}`}
      >
        <LinearGradient colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={{ padding: spacing.md, gap: spacing.xs }}>
          {finish && <MetallicSheen />}
          <View style={styles.compactHeader}>
            {institution ? <InstitutionMark name={institution} size={24} /> : <View style={[styles.compactDot, styles.whiteDot]} />}
            <Text style={[styles.compactKind, styles.whiteText]} numberOfLines={1}>{institution ? institution : kindLabel}</Text>
          </View>
          <Text style={[styles.compactName, styles.whiteText]} numberOfLines={1}>{account.name}</Text>
          <Text style={[styles.compactBalance, styles.whiteText]}>{formattedBalance}</Text>
          {profile.lastFour && <Text style={styles.whiteText}>•••• {profile.lastFour}</Text>}
          {equivalent && !equivalent.startsWith('—') && <Text style={styles.whiteText}>≈ {equivalent}</Text>}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.cardOuter,
        variant === 'hero' ? styles.heroCard : styles.carouselCard,
        cardShadow,
        { opacity: pressed ? 0.92 : 1 },
        style,
      ]}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${t("Cuenta")} ${account.name}, ${kindLabel}, ${t("saldo")} ${formattedBalance}`}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0.1, y: 0.0 }}
        end={{ x: 0.9, y: 1.0 }}
        style={[
          styles.gradientContainer,
          {
            borderRadius: variant === 'hero' ? radius.hero : radius.cardLg,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.28)',
          },
        ]}
      >
        {finish && <MetallicSheen />}
        {/* Top bar with badge */}
        <View style={styles.headerRow}>
          <Text style={[styles.accountName, styles.whiteText]} numberOfLines={1}>
            {account.name}
          </Text>
          <View style={styles.badge}>
            <Text style={[styles.badgeText, styles.whiteText]}>{kindLabel}</Text>
          </View>
        </View>

        {institution && <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
          <InstitutionMark name={institution} size={28} />
          <Text style={[styles.badgeText, styles.whiteText]} numberOfLines={1}>{institution}</Text>
        </View>}
        {/* Center balance */}
        <View style={styles.balanceContainer}>
          <Text style={[styles.balanceLabel, styles.whiteText]}>{t("Saldo disponible")}</Text>
          <Text
            style={[
              styles.balanceValue,
              styles.whiteText,
              variant === 'hero' && styles.heroBalanceValue,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formattedBalance}
          </Text>
        </View>


        {/* Bottom footer / currency */}
        <View style={styles.footerRow}>
          <Text style={[styles.currencyCode, styles.whiteText]}>{account.currency}</Text>
          <Text style={[styles.footerHint, styles.whiteText]}>{profile.lastFour ? `•••• ${profile.lastFour}` : 'NEXO Finance'}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: radius.cardLg,
  },
  carouselCard: {
    width: 290,
    minHeight: 175,
  },
  heroCard: {
    width: '100%',
    minHeight: 200,
    borderRadius: radius.hero,
  },
  gradientContainer: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'space-between',
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountName: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 16,
    fontWeight: '600',
    maxWidth: '60%',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  balanceContainer: {
    marginVertical: spacing.xs,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
  heroBalanceValue: {
    fontSize: 38,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currencyCode: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  footerHint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontWeight: '500',
  },
  whiteText: { color: '#FFFFFF' },
  whiteDot: { backgroundColor: '#FFFFFF' },
  compactContainer: {
    width: 150,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactKind: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactBalance: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
});
