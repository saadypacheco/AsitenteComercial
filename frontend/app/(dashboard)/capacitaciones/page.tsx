"use client";

// CAPACITACIÓN / Onboarding (Producto ③) — ruta de aprendizaje: barra de progreso,
// stepper de etapas, calendario de sesiones, alertas, progreso por agente,
// notificaciones y chat de ayuda. Datos reales (etapas + progreso por agente).
import { useEffect, useState } from "react";

import { Avatar, Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { askAi, type Tone } from "@/lib/queries/executive";
import { getProgramaCapacitacion, type Programa } from "@/lib/queries/gestion";

const EST_TONE: Record<string, Tone> = { programada: "brand", en_curso: "warning", finalizada: "ok", cancelada: "danger" };

export default function CapacitacionesPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.gestion;
  const [p, setP] = useState<Programa | null>(null);

  const [pregunta, setPregunta] = useState("");
  const [resp, setResp] = useState<{ answer: string; source: string } | null>(null);
  const [pensando, setPensando] = useState(false);

  useEffect(() => {
    getProgramaCapacitacion(locale).then(setP).catch(() => setP(null));
  }, [locale]);

  async function ayuda(texto: string) {
    if (!texto.trim()) return;
    setPensando(true);
    setResp(await askAi(texto, locale).catch(() => ({ answer: "—", source: "error" })));
    setPensando(false);
  }
  const fecha = (s: string | null) => (s ? new Date(s).toLocaleDateString(locale, { day: "2-digit", month: "short" }) : "—");
  const cuando = (s: string) => new Date(s).toLocaleDateString(locale, { day: "2-digit", month: "short" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-ink">{dict.inicio.nav.capacitaciones}</h1>
        {p && <p className="mt-0.5 text-sm text-muted">{p.programa.nombre}</p>}
      </header>

      {/* Barra de progreso global */}
      {p && (
        <Card className="mb-5 p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand">{t.capProgress}</span>
            <span className="text-sm text-muted"><span className="text-lg font-bold text-ink">{p.progreso.pct}%</span> · {p.progreso.completados}/{p.progreso.total}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-soft">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-all duration-500" style={{ width: `${p.progreso.pct}%` }} />
          </div>
        </Card>
      )}

      {/* Stepper de etapas */}
      {p && (
        <Card className="mb-5 p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand">{t.capStages}</h2>
          <ol className="flex gap-2 overflow-x-auto pb-1">
            {p.etapas.map((e, i) => {
              const done = e.pct === 100;
              return (
                <li key={e.id} className="flex min-w-[130px] flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <span className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : done || e.completados > 0 ? "bg-brand" : "bg-line"}`} />
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-ok text-white" : e.en_curso > 0 ? "bg-brand text-white" : "bg-soft text-faint"}`}>
                      {done ? "✓" : e.orden}
                    </span>
                    <span className={`h-0.5 flex-1 ${i === p.etapas.length - 1 ? "bg-transparent" : done ? "bg-brand" : "bg-line"}`} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-ink">{e.nombre}</p>
                  <p className="text-[11px] text-muted">{e.completados}/{e.completados + e.en_curso + e.pendientes} · {e.pct}%</p>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {/* Calendario */}
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">📅 {t.capCalendar}</h2>
            <ul className="space-y-2">
              {p?.calendario.map((k) => (
                <li key={k.id} className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-center">
                    <span className="text-xs font-bold leading-none text-brand">{fecha(k.fecha)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{k.nombre}</p>
                    <p className="text-xs text-muted">👥 {k.asistentes}</p>
                  </div>
                  <Badge tone={EST_TONE[k.estado]}>{t.capEstado[k.estado as keyof typeof t.capEstado]}</Badge>
                </li>
              ))}
              {p && p.calendario.length === 0 && <li className="text-sm text-muted">—</li>}
            </ul>
          </Card>

          {/* Progreso por agente */}
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{t.capByAgent}</h2>
            <ul className="space-y-3">
              {p?.agentes.map((a) => (
                <li key={a.nombre} className="flex items-center gap-3">
                  <Avatar name={a.nombre} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink">{a.nombre}</span>
                      <span className="shrink-0 text-xs font-bold text-brand">{a.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${a.pct}%` }} />
                    </div>
                    {a.etapa_actual && <p className="mt-0.5 text-[11px] text-muted">{t.capCurrentStage}: {a.etapa_actual}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Chat de ayuda */}
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">💬 {t.capHelp} <Badge tone="brand">BETA</Badge></h2>
            {resp && (
              <div className="mb-3 rounded-xl bg-brand-soft p-3 text-sm text-ink2">
                {resp.answer}
                <span className="mt-1 block text-xs text-faint">{resp.source === "ia" ? dict.inicio.answeredIa : dict.inicio.answeredAuto}</span>
              </div>
            )}
            <div className="flex gap-2">
              <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ayuda(pregunta)}
                placeholder={t.capHelpPlaceholder} className="w-full rounded-lg bg-soft px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none" />
              <button onClick={() => ayuda(pregunta)} disabled={pensando} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-white disabled:opacity-50">{pensando ? "…" : "➤"}</button>
            </div>
          </Card>
        </div>

        {/* Panel lateral: Alertas + Notificaciones */}
        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-warning">🔔 {t.capAlerts}</h2>
            <ul className="space-y-2.5">
              {p?.alertas.map((a, i) => (
                <li key={i} className="rounded-xl border border-line border-l-4 border-l-warning bg-white p-2.5">
                  <p className="text-sm font-semibold text-ink">{a.titulo}</p>
                  <p className="text-xs text-muted">{a.detalle}</p>
                </li>
              ))}
              {p && p.alertas.length === 0 && <li className="text-sm text-muted">{t.capNoAlerts}</li>}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">✨ {t.capNotifications}</h2>
            <ul className="space-y-2.5">
              {p?.notificaciones.map((n, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5">🎓</span>
                  <span className="text-muted"><span className="font-semibold text-ink">{n.agente}</span> {t.capDone} <span className="text-ink2">{n.etapa}</span> · {cuando(n.ts)}</span>
                </li>
              ))}
              {p && p.notificaciones.length === 0 && <li className="text-sm text-muted">{t.capNoNotifs}</li>}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
