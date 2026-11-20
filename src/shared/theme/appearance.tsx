import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { AccessibilityInfo, Appearance, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type AppearancePreference = 'auto' | 'light' | 'dark';
const preferenceKey = 'nexo.appearance.preference';
const glassKey = 'nexo.appearance.glass';

interface AppearanceSettings {
  preference: AppearancePreference;
  ready: boolean;
  saving: boolean;
  error: string | null;
  change: (value: AppearancePreference) => Promise<void>;
  glassEnabled: boolean;
  glassReady: boolean;
  glassError: boolean;
  glassKind: 'native' | 'blur' | 'solid';
  changeGlass: (enabled: boolean) => Promise<void>;
}

const AppearanceContext = createContext<AppearanceSettings | null>(null);

function supportsNativeGlass() {
  if (Platform.OS !== 'ios') return false;
  try {
    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

export function AppearanceProvider({ children }: PropsWithChildren) {
  const [preference, setPreference] = useState<AppearancePreference>('auto');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glassEnabled, setGlassEnabled] = useState(true);
  const [glassReady, setGlassReady] = useState(false);
  const [glassError, setGlassError] = useState(false);
  const [reducedTransparency, setReducedTransparency] = useState(false);
  const [nativeGlass] = useState(supportsNativeGlass);
  const pending = useRef(false);
  const glassPending = useRef(false);

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(glassKey).then(value => {
      if (active) setGlassEnabled(value !== 'off');
    }).catch(() => {
      if (active) setGlassError(true);
    }).finally(() => {
      if (active) setGlassReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReducedTransparency);
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => {
      if (active) setReducedTransparency(value);
    }).catch(() => undefined);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(preferenceKey).then(value => {
      if (!active) return;
      const initial = value === 'light' || value === 'dark' ? value : 'auto';
      Appearance.setColorScheme(initial);
      setPreference(initial);
    }).catch(() => {
      if (active) setError('No se pudo leer tu preferencia de apariencia.');
    }).finally(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []);

  async function change(value: AppearancePreference) {
    if (!ready || pending.current || value === preference) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      await SecureStore.setItemAsync(preferenceKey, value);
      Appearance.setColorScheme(value);
      setPreference(value);
    } catch {
      setError('No se pudo guardar la apariencia. Inténtalo de nuevo.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  async function changeGlass(enabled: boolean) {
    if (!glassReady || glassPending.current || enabled === glassEnabled) return;
    glassPending.current = true;
    setGlassReady(false);
    setGlassError(false);
    try {
      await SecureStore.setItemAsync(glassKey, enabled ? 'on' : 'off');
      setGlassEnabled(enabled);
    } catch {
      setGlassError(true);
    } finally {
      glassPending.current = false;
      setGlassReady(true);
    }
  }

  const glassKind = !glassEnabled || reducedTransparency ? 'solid' : nativeGlass ? 'native' : 'blur';
  return <AppearanceContext.Provider value={{
    preference, ready, saving, error, change, glassEnabled, glassReady, glassError, glassKind, changeGlass,
  }}>
    {children}
  </AppearanceContext.Provider>;
}

export function useAppearanceSettings() {
  const settings = useContext(AppearanceContext);
  if (!settings) throw new Error('AppearanceProvider is missing');
  return settings;
}
