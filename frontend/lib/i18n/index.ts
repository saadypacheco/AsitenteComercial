// i18n mínimo es/en (FR-010, Principio VI: sin strings de UI hardcodeados).
// El demo soporta español e inglés; la arquitectura no cierra la puerta a más idiomas.
import { es } from "./es";
import { en } from "./en";

export type Locale = "es" | "en";
export type Dictionary = typeof es;

const dictionaries: Record<Locale, Dictionary> = { es, en };

export const DEFAULT_LOCALE: Locale = "es";

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

// Preferencia de idioma compartida entre pantallas (persiste en el navegador).
const LOCALE_KEY = "mc_locale";

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const v = localStorage.getItem(LOCALE_KEY);
  return v === "es" || v === "en" ? v : DEFAULT_LOCALE;
}

export function storeLocale(locale: Locale): void {
  if (typeof window !== "undefined") localStorage.setItem(LOCALE_KEY, locale);
}

// Label visible de un tipo de evento comercial (el valor canónico en BD es sin tilde).
export function eventTypeLabel(locale: Locale, type: string): string {
  const dict = getDictionary(locale);
  return dict.eventTypes[type as keyof Dictionary["eventTypes"]] ?? type;
}
