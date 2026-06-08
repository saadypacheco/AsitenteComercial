"use client";

// Grupos: actividad de los chats capturados (solo lectura; vienen del WhatsApp).
import { useEffect, useState } from "react";

import { Badge, ToneDot } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { getGrupos, type Grupo } from "@/lib/queries/gestion";
import type { Tone } from "@/lib/queries/executive";

function estado(m7: number) {
  return m7 === 0 ? "inactivo" : m7 >= 10 ? "activo" : "atencion";
}
function actividad(m7: number) {
  return m7 === 0 ? "baja" : m7 >= 10 ? "alta" : "media";
}
const EST_TONE: Record<string, Tone> = { activo: "ok", atencion: "warning", inactivo: "danger" };
const ACT_TONE: Record<string, Tone> = { alta: "ok", media: "warning", baja: "danger" };

export default function GruposPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.gestion;
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);

  useEffect(() => {
    getGrupos(locale).then(setGrupos).catch(() => setGrupos([]));
  }, [locale]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="mb-5 text-2xl font-bold text-ink">{dict.inicio.nav.grupos}</h1>

      {grupos && grupos.length === 0 && <Card className="px-4 py-16 text-center text-muted">{t.grpEmpty}</Card>}
      <ul className="space-y-3">
        {grupos?.map((g) => {
          const e = estado(g.mensajes_7d);
          const a = actividad(g.mensajes_7d);
          return (
            <li key={g.id}>
              <Card className="flex items-center gap-3 p-4">
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
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
