import { useEffect } from 'react';
import { startAutomaticBackups } from '../features/backup/automatic-backup';
import { LanguageProvider } from '../shared/language/language';
import { AppearanceProvider } from '../shared/theme/appearance';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'react-native';
import { useTheme } from '../shared/theme/theme';

export default function Layout() {
  useEffect(startAutomaticBackups, []);
  return (
    <LanguageProvider>
      <AppearanceProvider><AppNavigation /></AppearanceProvider>
    </LanguageProvider>
  );
}

function AppNavigation() {
  const { colors, isDark } = useTheme();
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
