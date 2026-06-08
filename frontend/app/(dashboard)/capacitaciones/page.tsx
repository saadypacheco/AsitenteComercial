"use client";

// CAPACITACIONES (Producto ③) — vista command center: stats (total, programadas,
// finalizadas, asistentes) + tarjetas con estado, instructor, fecha y asistencia.
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { getCapacitaciones, type Capacitacion } from "@/lib/queries/gestion";
import type { Tone } from "@/lib/queries/executive";

const EST_TONE: Record<string, Tone> = { programada: "brand", en_curso: "warning", finalizada: "ok", cancelada: "danger" };

export default function CapacitacionesPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.gestion;
  const [items, setItems] = useState<Capacitacion[] | null>(null);

  useEffect(() => {
    getCapacitaciones(locale).then(setItems).catch(() => setItems([]));
  }, [locale]);

  const stats = useMemo(() => {
    const c = items ?? [];
    return {
      total: c.length,
      programadas: c.filter((x) => x.estado === "programada" || x.estado === "en_curso").length,
      finalizadas: c.filter((x) => x.estado === "finalizada").length,
      asistentes: c.reduce((s, x) => s + (x.asistentes || 0), 0),
    };
  }, [items]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="mb-4 text-2xl font-bold text-ink">{dict.inicio.nav.capacitaciones}</h1>

      {/* Stats */}
      {items && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-t-[3px] border-t-brand p-4"><p className="text-2xl font-bold text-brand">{stats.total}</p><p className="text-[11px] text-muted">{t.capCount}</p></Card>
          <Card className="border-t-[3px] border-t-warning p-4"><p className="text-2xl font-bold text-warning">{stats.programadas}</p><p className="text-[11px] text-muted">{t.capScheduled}</p></Card>
          <Card className="border-t-[3px] border-t-ok p-4"><p className="text-2xl font-bold text-ok">{stats.finalizadas}</p><p className="text-[11px] text-muted">{t.capCompleted}</p></Card>
          <Card className="border-t-[3px] border-t-line p-4"><p className="text-2xl font-bold text-ink">{stats.asistentes}</p><p className="text-[11px] text-muted">{t.capTotalAtt}</p></Card>
        </div>
      )}

      {items && items.length === 0 && <Card className="px-4 py-16 text-center text-muted">{t.capEmpty}</Card>}
      <ul className="space-y-3">
        {items?.map((c) => (
          <li key={c.id}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg text-brand">🎓</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{c.nombre}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {c.instructor && <>{t.capInstructor}: {c.instructor}</>}
                    {c.fecha && <> · {new Date(c.fecha).toLocaleDateString(locale)}</>}
                  </p>
                </div>
                <Badge tone={EST_TONE[c.estado]}>{t.capEstado[c.estado]}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                <span className="text-sm">👥</span>
                <span className="text-sm font-semibold text-ink">{c.asistentes}</span>
                <span className="text-xs text-muted">{t.capAttendees}</span>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
