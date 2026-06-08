"use client";

// Contexto de idioma compartido por todo el panel: el toggle del topbar cambia el
// idioma y TODAS las pantallas (sidebar, /inicio, secciones) reaccionan. Persiste
// en localStorage (getStoredLocale/storeLocale). FR-010 / Principio VI.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { DEFAULT_LOCALE, getDictionary, getStoredLocale, storeLocale, type Dictionary, type Locale } from "@/lib/i18n";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; toggle: () => void; t: Dictionary };

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => setLocaleState(getStoredLocale()), []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    storeLocale(l);
  }
  const toggle = () => setLocale(locale === "es" ? "en" : "es");

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggle, t: getDictionary(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale debe usarse dentro de <LocaleProvider>");
  return ctx;
}
