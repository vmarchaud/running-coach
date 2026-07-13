import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { dictionaries, Language } from "./dictionaries";

const STORAGE_KEY = "language";

function readStoredLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "fr" ? "fr" : "en";
}

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// key is "namespace.key", e.g. "nav.dashboard" -> dictionaries.en.nav.dashboard.
// Falls back to English, then to the raw key, so a missing translation never
// renders blank.
function translate(language: Language, key: string): string {
  const [namespace, ...rest] = key.split(".");
  const entryKey = rest.join(".");
  return (
    dictionaries[language]?.[namespace]?.[entryKey] ?? dictionaries.en?.[namespace]?.[entryKey] ?? key
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage());

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key: string) => translate(language, key),
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
