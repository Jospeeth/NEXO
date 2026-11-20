import { useColorScheme } from 'react-native';

const light = {
  background: '#F8F7FC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F3F0FA',
  text: '#181525',
  secondaryText: '#696477',
  tertiaryText: '#9A94A8',
  primary: '#6D28D9',
  secondary: '#8B5CF6',
  accent: '#8B5CF6',
  lavender: '#EDE9FE',
  selected: '#EDE9FE',
  onPrimary: '#FFFFFF',
  border: '#E8E5EF',
  borderSubtle: '#F0EDF6',
  income: '#16A34A',
  incomeLight: '#DCFCE7',
  expense: '#DC4C64',
  expenseLight: '#FEE2E2',
  glassBackground: 'rgba(255, 255, 255, 0.78)',
  glassBorder: 'rgba(255, 255, 255, 0.8)',
  glassBorderSubtle: 'rgba(232, 229, 239, 0.7)',
  glassControl: 'rgba(255, 255, 255, 0.3)',
  heroGradientStart: '#6D28D9',
  heroGradientEnd: '#4C1D95',
  heroGradientAccent: '#8B5CF6',
  cardGradientStart: '#7C3AED',
  cardGradientEnd: '#2E1065',
};

const dark: typeof light = {
  background: '#0F0C18',
  surface: '#1A1528',
  surfaceSubtle: '#241D35',
  text: '#F5F1FF',
  secondaryText: '#A9A0BD',
  tertiaryText: '#756D88',
  primary: '#A78BFA',
  secondary: '#C4B5FD',
  accent: '#C4B5FD',
  lavender: '#2E2248',
  selected: '#332356',
  onPrimary: '#0F0C18',
  border: '#2E273F',
  borderSubtle: '#251F34',
  income: '#4ADE80',
  incomeLight: '#14532D',
  expense: '#F87171',
  expenseLight: '#7F1D1D',
  glassBackground: 'rgba(26, 21, 40, 0.78)',
  glassBorder: 'rgba(255, 255, 255, 0.16)',
  glassBorderSubtle: 'rgba(255, 255, 255, 0.08)',
  glassControl: 'rgba(255, 255, 255, 0.12)',
  heroGradientStart: '#5B21B6',
  heroGradientEnd: '#2E1065',
  heroGradientAccent: '#7C3AED',
  cardGradientStart: '#5B21B6',
  cardGradientEnd: '#1E0B3E',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  page: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  xs: 6,
  sm: 10,
  card: 16,
  cardLg: 22,
  hero: 28,
  pill: 999,
  full: 9999,
};

export const type = {
  micro: 11,
  caption: 13,
  body: 15,
  callout: 16,
  subheadline: 17,
  headline: 18,
  section: 20,
  title: 28,
  balance: 36,
  heroBalance: 44,
  amountInput: 40,
};

export const elevation = {
  shadowColor: '#181525',
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
};

export const cardShadow = {
  shadowColor: '#3B0764',
  shadowOpacity: 0.22,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
};

export const subtleShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.05,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
};

export function useTheme() {
  const isDark = useColorScheme() === 'dark';
  return { colors: isDark ? dark : light, isDark };
}
