import type { Locale } from "@/lib/i18n";

// Hora mostrada SIEMPRE en zona del negocio (ET), coherente con "hoy" (FR-018).
const BUSINESS_TZ = "America/New_York";

export function formatTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(locale === "en" ? "en-US" : "es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BUSINESS_TZ,
  });
}
