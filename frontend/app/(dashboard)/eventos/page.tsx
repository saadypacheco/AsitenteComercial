"use client";

// EVENTOS comerciales — vista command center: stats (eventos, abiertas, potencial
// total $), filtros por tipo, tarjetas con probabilidad de cierre + potencial $ y
// acciones (resolver/descartar/reabrir).
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { getEventos, updateEventoStatus, type Evento } from "@/lib/queries/gestion";
import type { Tone } from "@/lib/queries/executive";

const TIPO_TONE: Record<string, Tone> = { venta: "ok", objecion: "danger", seguimiento: "brand", consulta: "warning" };
const STATUS_TONE: Record<string, Tone> = { open: "neutral", in_progress: "warning", done: "ok", dismissed: "neutral" };
const NIVEL_TONE: Record<string, Tone> = { alto: "danger", medio: "warning", bajo: "ok" };
const TIPOS = ["venta", "objecion", "seguimiento", "consulta"] as const;

function money(n: number) {
  return "$" + (n ?? 0).toLocaleString("en-US");
}

export default function EventosPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.gestion;
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  function reload() {
    getEventos(locale).then(setEventos).catch(() => setEventos([]));
  }
  useEffect(reload, [locale]);

  async function setStatus(e: Evento, status: string) {
    setBusy(true);
    await updateEventoStatus(e.id, status).catch(() => {});
    reload();
    setBusy(false);
  }

  const stats = useMemo(() => {
    const all = eventos ?? [];
    const abiertas = all.filter((e) => e.status === "open" || e.status === "in_progress");
    return { total: all.length, abiertas: abiertas.length, potencial: abiertas.reduce((s, e) => s + (e.potencial || 0), 0) };
  }, [eventos]);

  const items = useMemo(() => (filter === "all" ? eventos ?? [] : (eventos ?? []).filter((e) => e.tipo === filter)), [eventos, filter]);
  const nivelLabel: Record<string, string> = { alto: dict.inicio.nivelAlto, medio: dict.inicio.nivelMedio, bajo: dict.inicio.nivelBajo };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <h1 className="mb-4 text-2xl font-bold text-ink">{dict.inicio.nav.eventos}</h1>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Card className="border-t-[3px] border-t-brand p-4">
          <p className="text-2xl font-bold text-brand">{stats.total}</p>
          <p className="text-[11px] text-muted">{t.evCount}</p>
        </Card>
        <Card className="border-t-[3px] border-t-warning p-4">
          <p className="text-2xl font-bold text-warning">{stats.abiertas}</p>
          <p className="text-[11px] text-muted">{t.evOpenCount}</p>
        </Card>
        <Card className="border-t-[3px] border-t-ok p-4">
          <p className="text-2xl font-bold text-ok">{money(stats.potencial)}</p>
          <p className="text-[11px] text-muted">{t.evTotalPotential}</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(["all", ...TIPOS] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === f ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-soft"}`}>
            {f === "all" ? t.evFilterAll : dict.eventTypes[f as keyof typeof dict.eventTypes]}
          </button>
        ))}
      </div>

      {eventos && items.length === 0 && <Card className="px-4 py-16 text-center text-muted">{t.evEmpty}</Card>}
      <ul className="space-y-3">
        {items.map((e) => {
          const cerrado = e.status === "done" || e.status === "dismissed";
          return (
            <li key={e.id}>
              <Card className={`p-4 ${cerrado ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{e.titulo}</p>
                    {e.detalle && <p className="mt-0.5 text-sm text-muted">{e.detalle}</p>}
                    <p className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={TIPO_TONE[e.tipo] ?? "neutral"}>{dict.eventTypes[e.tipo as keyof typeof dict.eventTypes] ?? e.tipo}</Badge>
                      <Badge tone={STATUS_TONE[e.status]}>{t.evStatus[e.status]}</Badge>
                      {e.nivel && <Badge tone={NIVEL_TONE[e.nivel] ?? "neutral"}>{nivelLabel[e.nivel] ?? e.nivel}</Badge>}
                    </p>
                  </div>
                  {e.potencial > 0 && (
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-ok">{money(e.potencial)}</p>
                      <p className="text-[10px] text-muted">{t.evPotential}</p>
                    </div>
                  )}
                </div>

                {/* Probabilidad */}
                {e.probabilidad > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${e.probabilidad}%` }} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">{e.probabilidad}% {t.evCloseProb}</p>
                  </div>
                )}

                <div className="mt-3 flex gap-2 border-t border-line pt-3">
                  {!cerrado ? (
                    <>
                      <button onClick={() => setStatus(e, "done")} disabled={busy} className="rounded-lg bg-ok px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">✓ {t.evResolve}</button>
                      <button onClick={() => setStatus(e, "dismissed")} disabled={busy} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-soft disabled:opacity-50">{t.evDismiss}</button>
                    </>
                  ) : (
                    <button onClick={() => setStatus(e, "open")} disabled={busy} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-brand hover:bg-soft disabled:opacity-50">{t.evReopen}</button>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
