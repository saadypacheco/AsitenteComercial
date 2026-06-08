"use client";

// Eventos comerciales (venta/objeción/seguimiento/consulta) detectados. Lista +
// cambiar estado (resolver/descartar/reabrir).
import { useEffect, useState } from "react";

import { Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { getEventos, updateEventoStatus, type Evento } from "@/lib/queries/gestion";
import type { Tone } from "@/lib/queries/executive";

const TIPO_TONE: Record<string, Tone> = { venta: "ok", objecion: "danger", seguimiento: "brand", consulta: "warning" };
const STATUS_TONE: Record<string, Tone> = { open: "neutral", in_progress: "warning", done: "ok", dismissed: "neutral" };
const NIVEL_TONE: Record<string, Tone> = { alto: "danger", medio: "warning", bajo: "ok" };

export default function EventosPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.gestion;
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [busy, setBusy] = useState(false);

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

  const nivelLabel: Record<string, string> = { alto: dict.inicio.nivelAlto, medio: dict.inicio.nivelMedio, bajo: dict.inicio.nivelBajo };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="mb-5 text-2xl font-bold text-ink">{dict.inicio.nav.eventos}</h1>

      {eventos && eventos.length === 0 && <Card className="px-4 py-16 text-center text-muted">{t.evEmpty}</Card>}
      <ul className="space-y-3">
        {eventos?.map((e) => {
          const cerrado = e.status === "done" || e.status === "dismissed";
          return (
            <li key={e.id}>
              <Card className={`p-4 ${cerrado ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{e.titulo}</p>
                    {e.detalle && <p className="mt-0.5 text-sm text-muted">{e.detalle}</p>}
                    <p className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={TIPO_TONE[e.tipo] ?? "neutral"}>{dict.eventTypes[e.tipo as keyof typeof dict.eventTypes] ?? e.tipo}</Badge>
                      <Badge tone={STATUS_TONE[e.status]}>{t.evStatus[e.status]}</Badge>
                      {e.nivel && <Badge tone={NIVEL_TONE[e.nivel] ?? "neutral"}>{nivelLabel[e.nivel] ?? e.nivel}</Badge>}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-line pt-3">
                  {!cerrado ? (
                    <>
                      <button onClick={() => setStatus(e, "done")} disabled={busy}
                        className="rounded-lg bg-ok px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
                        ✓ {t.evResolve}
                      </button>
                      <button onClick={() => setStatus(e, "dismissed")} disabled={busy}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-soft disabled:opacity-50">
                        {t.evDismiss}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setStatus(e, "open")} disabled={busy}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-brand hover:bg-soft disabled:opacity-50">
                      {t.evReopen}
                    </button>
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
