import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { readCurrencyPreferences, readRates } from './repository';

export function useExchange(date?: string) {
  const [preferences, setPreferences] = useState<Awaited<ReturnType<typeof readCurrencyPreferences>>>();
  const [stored, setStored] = useState<{ date?: string; result: Awaited<ReturnType<typeof readRates>> }>();
  const reload = useCallback(async (force = false) => {
    const next = await readCurrencyPreferences();
    setPreferences(next);
    const result = await readRates(date, force);
    setStored({ date, result });
  }, [date]);

  useFocusEffect(useCallback(() => {
    let active = true;
    const poll = () => {
      if (AppState.currentState !== 'active') return;
      void readCurrencyPreferences().then(value => { if (active) setPreferences(value); }).catch(() => undefined);
      void readRates(date).then(result => { if (active) setStored({ date, result }); }).catch(() => undefined);
    };
    poll();
    const sub = AppState.addEventListener('change', poll);
    const timer = setInterval(poll, 60_000);
    return () => { active = false; sub.remove(); clearInterval(timer); };
  }, [date]));

  const rates = stored?.date === date ? stored?.result : undefined;
  return { settings: preferences ? { ...preferences, quote: rates?.value ?? null, stale: rates?.offline ?? false } : undefined, reload };
}
