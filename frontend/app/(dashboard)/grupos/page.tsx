"use client";

// GRUPOS — vista command center: stats (grupos, activos, en atención, mensajes
// totales) + tarjetas con barra de actividad relativa. Solo lectura (vienen de la
// captura de WhatsApp).
import { useEffect, useMemo, useState } from "react";

import { Badge, ToneDot } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { getGrupos, type Grupo } from "@/lib/queries/gestion";
import type { Tone } from "@/lib/queries/executive";

const estado = (m7: number) => (m7 === 0 ? "inactivo" : m7 >= 10 ? "activo" : "atencion");
const actividad = (m7: number) => (m7 === 0 ? "baja" : m7 >= 10 ? "alta" : "media");
const EST_TONE: Record<string, Tone> = { activo: "ok", atencion: "warning", inactivo: "danger" };
const ACT_TONE: Record<string, Tone> = { alta: "ok", media: "warning", baja: "danger" };

export default function GruposPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.gestion;
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);

  useEffect(() => {
    getGrupos(locale).then(setGrupos).catch(() => setGrupos([]));
  }, [locale]);

  const { activos, atencion, totalMsgs, max } = useMemo(() => {
    const g = grupos ?? [];
    return {
      activos: g.filter((x) => estado(x.mensajes_7d) === "activo").length,
      atencion: g.filter((x) => estado(x.mensajes_7d) === "atencion").length,
      totalMsgs: g.reduce((s, x) => s + (x.mensajes_total || 0), 0),
      max: Math.max(1, ...g.map((x) => x.mensajes_7d || 0)),
    };
  }, [grupos]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="mb-4 text-2xl font-bold text-ink">{dict.inicio.nav.grupos}</h1>

      {/* Stats */}
      {grupos && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-t-[3px] border-t-brand p-4"><p className="text-2xl font-bold text-brand">{grupos.length}</p><p className="text-[11px] text-muted">{t.grpCount}</p></Card>
          <Card className="border-t-[3px] border-t-ok p-4"><p className="text-2xl font-bold text-ok">{activos}</p><p className="text-[11px] text-muted">{t.grpActivos}</p></Card>
          <Card className="border-t-[3px] border-t-warning p-4"><p className="text-2xl font-bold text-warning">{atencion}</p><p className="text-[11px] text-muted">{t.grpAtencion}</p></Card>
          <Card className="border-t-[3px] border-t-line p-4"><p className="text-2xl font-bold text-ink">{totalMsgs}</p><p className="text-[11px] text-muted">{t.grpTotalMsgs}</p></Card>
        </div>
      )}

      {grupos && grupos.length === 0 && <Card className="px-4 py-16 text-center text-muted">{t.grpEmpty}</Card>}
      <ul className="space-y-3">
        {grupos?.map((g) => {
          const e = estado(g.mensajes_7d);
          const a = actividad(g.mensajes_7d);
          return (
            <li key={g.id}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">#</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{g.nombre}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {g.mensajes_7d} {t.grpMsgs}
                      {g.ultimo && <> · {t.grpLast} {new Date(g.ultimo).toLocaleDateString(locale)}</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={EST_TONE[e]}>{t.grpEstado[e as keyof typeof t.grpEstado]}</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <ToneDot tone={ACT_TONE[a]} />
                      {t.grpAct[a as keyof typeof t.grpAct]}
                    </span>
                  </div>
                </div>
                {/* Barra de actividad relativa (7 días) */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-soft">
                  <div className={`h-full rounded-full ${a === "alta" ? "bg-ok" : a === "media" ? "bg-warning" : "bg-danger"}`}
                    style={{ width: `${Math.round((g.mensajes_7d / max) * 100)}%` }} />
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
