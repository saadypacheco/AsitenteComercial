"use client";

// Capacitaciones (Producto ③): listado con estado, fecha, instructor y asistencia.
import { useEffect, useState } from "react";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="mb-5 text-2xl font-bold text-ink">{dict.inicio.nav.capacitaciones}</h1>

      {items && items.length === 0 && <Card className="px-4 py-16 text-center text-muted">{t.capEmpty}</Card>}
      <ul className="space-y-3">
        {items?.map((c) => (
          <li key={c.id}>
            <Card className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">🎓</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{c.nombre}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {c.instructor && <>{t.capInstructor}: {c.instructor} · </>}
                  {c.asistentes} {t.capAttendees}
                  {c.fecha && <> · {new Date(c.fecha).toLocaleDateString(locale)}</>}
                </p>
              </div>
              <Badge tone={EST_TONE[c.estado]}>{t.capEstado[c.estado]}</Badge>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
