import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import { english } from './english';

type Language = 'es' | 'en';
const preferenceKey = 'nexo.language.preference';
const spanish = (label: string) => label;
const translateEnglish = (label: string) => english[label] ?? label;

interface LanguageSettings {
  language: Language;
  locale: string;
  t: (label: string) => string;
  ready: boolean;
  saving: boolean;
  error: boolean;
  change: (value: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageSettings | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>('es');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(preferenceKey).then(value => {
      if (active && value === 'en') setLanguage('en');
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []);

  async function change(value: Language) {
    if (!ready || pending.current || value === language) return;
    pending.current = true;
    setSaving(true);
    setError(false);
    try {
      await SecureStore.setItemAsync(preferenceKey, value);
      setLanguage(value);
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <LanguageContext.Provider value={{
      language, ready, saving, error, change,
      locale: language === 'en' ? 'en-US' : 'es-CO',
      t: language === 'en' ? translateEnglish : spanish,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is missing');
  return value;
}
