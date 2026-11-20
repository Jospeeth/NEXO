import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { isStale } from './rate';
import { readExchangeSettings, refreshExchangeRate } from './repository';

async function readDisplaySettings() {
  const settings = await readExchangeSettings();
  return { ...settings, stale: !settings.manual && settings.quote !== null && isStale(settings.quote, Date.now()) };
}

export function useExchange() {
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof readDisplaySettings>>>();
  const reload = useCallback(async () => {
    const next = await readDisplaySettings();
    setSettings(next);
    return next;
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    async function poll() {
      if (AppState.currentState !== 'active') return;
      try {
        const next = await readDisplaySettings();
        if (!active) return;
        setSettings(next);
        if (!next.manual && (await refreshExchangeRate()) === 'updated' && active) await reload();
      } catch {
        // Keep the previous quote during transient storage errors.
      }
    }
    void poll();
    const timer = setInterval(() => { void poll(); }, 60_000);
    const subscription = AppState.addEventListener('change', () => { void poll(); });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [reload]));

  return { settings, reload };
}
