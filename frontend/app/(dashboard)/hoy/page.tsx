"use client";

// [US2] "¿Qué pasó hoy?" — rediseño de 5 bloques (clarify 2026-06-08, FR-007/FR-011).
// Bloques: (1) Pulso del día · (2) Necesita tu atención · (3) Eventos comerciales (US4)
// · (4) Actividad por grupo · (5) Buscador. Mobile-first (FR-008), i18n es/en (FR-010).
// Estado actual del cableado: Pulso (mensajes/grupos) y Por grupo leen datos reales;
// Atención (FR-020), Eventos (US4) y Buscador (FR-021) muestran su estructura final con
// nota honesta de "se conecta al backend en el próximo paso" (no son placeholders falsos).
import Link from "next/link";
import { useEffect, useState } from "react";

import { AccentCard, Card, Kpi, Pill, SectionLabel, WiringNote } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { formatTime } from "@/lib/format";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import { getDailySummary, type DailySummary } from "@/lib/queries/daily";

export default function HoyPage() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [data, setData] = useState<DailySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const t = getDictionary(locale).today;

  useEffect(() => {
    requireAuth();
    getDailySummary().then(setData).catch((e) => setError(e.message));
  }, []);

  const grupos = data?.por_chat.length ?? 0;

  return (
    <main className="mx-auto max-w-md px-4 pb-12 pt-6">
      {/* Header con marca en gradiente */}
      <header className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-gradient text-2xl font-bold">{t.title}</h1>
          <p className="mt-0.5 text-sm text-muted">{t.subtitle}</p>
          {data && <p className="mt-1 text-xs text-faint">{data.fecha_et} · ET</p>}
        </div>
        <button
          onClick={() => setLocale(locale === "es" ? "en" : "es")}
          className="shrink-0 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-muted shadow-card"
          aria-label="toggle language"
        >
          {locale === "es" ? "EN" : "ES"}
        </button>
      </header>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {!data && !error && <p className="text-sm text-muted">…</p>}

      {data && data.vacio && (
        <Card className="px-4 py-12 text-center">
          <p className="text-muted">{t.empty}</p>
        </Card>
      )}

      {data && !data.vacio && (
        <>
          {/* ── Bloque 1 — Pulso del día ─────────────────────────── */}
          <SectionLabel>{t.pulse}</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Kpi value={data.total_mensajes} label={t.kpiMessages} tone="brand" />
            <Kpi value={grupos} label={t.kpiGroups} tone="neutral" />
            {/* Pendientes (FR-020) y Eventos (US4): backend pendiente → "—" honesto */}
            <Kpi value="—" label={t.kpiPending} tone="warning" />
            <Kpi value="—" label={t.kpiEvents} tone="ok" />
          </div>

          {/* ── Bloque 2 — Necesita tu atención (FR-020) ─────────── */}
          <SectionLabel>{t.attention}</SectionLabel>
          <WiringNote>{t.attentionWiring}</WiringNote>

          {/* ── Bloque 3 — Eventos comerciales (US4) ─────────────── */}
          <SectionLabel>{t.inferred}</SectionLabel>
          <WiringNote>{t.eventsWiring}</WiringNote>

          {/* ── Bloque 4 — Actividad por grupo ───────────────────── */}
          <SectionLabel>{t.byGroup}</SectionLabel>
          <ul className="space-y-2">
            {data.por_chat.map((c) => (
              <li key={c.chat_id}>
                <Link href={`/hoy/${c.chat_id}`} className="block active:opacity-80">
                  <AccentCard tone="brand" className="flex items-center justify-between">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">
                        {c.nombre ?? c.chat_id}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                        <Pill tone={c.tipo === "group" ? "brand" : "neutral"}>
                          {c.tipo === "group" ? t.group : t.direct}
                        </Pill>
                        {formatTime(c.ultimo, locale)}
                      </span>
                    </span>
                    <span className="ml-3 shrink-0 rounded-full bg-soft px-2.5 py-1 text-sm font-bold text-ink">
                      {c.mensajes}
                    </span>
                  </AccentCard>
                </Link>
              </li>
            ))}
          </ul>

          {/* ── Bloque 5 — Buscador (FR-021) ─────────────────────── */}
          <SectionLabel>{t.search}</SectionLabel>
          <Card className="px-3 py-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 shrink-0 text-faint"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
              />
            </div>
          </Card>
          <p className="mt-2 px-1 text-xs text-faint">{t.searchWiring}</p>
        </>
      )}
    </main>
  );
}
