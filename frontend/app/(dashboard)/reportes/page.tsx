"use client";

// REPORTES — analítica del equipo comercial: actividad semanal, ventas por agente,
// eventos por tipo, pipeline de oportunidades y resumen del equipo. Compuesto de
// los datos que ya tenemos (command + eventos).
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { getCommand, type Command } from "@/lib/queries/executive";
import { getEventos, type Evento } from "@/lib/queries/gestion";

function money(n: number) {
  return "$" + (n ?? 0).toLocaleString("en-US");
}

export default function ReportesPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.reportes;
  const [c, setC] = useState<Command | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);

  useEffect(() => {
    getCommand(locale).then(setC).catch(() => setC(null));
    getEventos(locale).then(setEventos).catch(() => setEventos([]));
  }, [locale]);

  // Etiquetas de los últimos 7 días
  const dias = useMemo(() => {
    const out: string[] = [];
    const base = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      out.push(d.toLocaleDateString(locale, { weekday: "short" }));
    }
    return out;
  }, [locale]);

  const eventosPorTipo = useMemo(() => {
    const tipos = ["venta", "objecion", "seguimiento", "consulta"] as const;
    return tipos.map((tp) => ({ tipo: tp, n: eventos.filter((e) => e.tipo === tp).length }));
  }, [eventos]);

  const team = useMemo(() => {
    const e = c?.equipo ?? [];
    return {
      saturada: e.filter((x) => x.estado === "saturada").length,
      normal: e.filter((x) => x.estado === "normal").length,
      excelente: e.filter((x) => x.estado === "excelente").length,
    };
  }, [c]);

  const serie = c?.actividad.serie_7d ?? [];
  const maxSerie = Math.max(1, ...serie);
  const maxVentas = Math.max(1, ...(c?.ranking.map((r) => r.ventas) ?? [1]));
  const maxEv = Math.max(1, ...eventosPorTipo.map((x) => x.n));
  const potencial = eventos.filter((e) => e.status === "open" || e.status === "in_progress").reduce((s, e) => s + (e.potencial || 0), 0);
  const oppsAbiertas = eventos.filter((e) => e.status === "open" || e.status === "in_progress").length;

  const EV_COLOR: Record<string, string> = { venta: "bg-ok", objecion: "bg-danger", seguimiento: "bg-brand", consulta: "bg-warning" };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <h1 className="mb-5 text-2xl font-bold text-ink">{dict.inicio.nav.reportes}</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Actividad semanal (barras verticales) */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand">📈 {t.weeklyActivity}</h2>
          <div className="flex h-36 items-end gap-2">
            {serie.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-[10px] font-semibold text-muted">{v}</span>
                <div className="w-full rounded-t-md bg-gradient-to-t from-brand to-brand-2" style={{ height: `${Math.max(4, (v / maxSerie) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2">
            {dias.map((d, i) => <span key={i} className="flex-1 text-center text-[10px] text-faint">{d}</span>)}
          </div>
        </Card>

        {/* Ventas por agente (barras horizontales) */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand">🏆 {t.salesByAgent}</h2>
          <ul className="space-y-2.5">
            {c?.ranking.map((r) => (
              <li key={r.nombre} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-ink2">{r.nombre}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-soft">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(r.ventas / maxVentas) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-bold text-ink">{r.ventas}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Eventos por tipo */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand">✦ {t.eventsByType}</h2>
          <ul className="space-y-2.5">
            {eventosPorTipo.map((x) => (
              <li key={x.tipo} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-ink2">{dict.eventTypes[x.tipo as keyof typeof dict.eventTypes]}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-soft">
                  <div className={`h-full rounded-full ${EV_COLOR[x.tipo]}`} style={{ width: `${(x.n / maxEv) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-bold text-ink">{x.n}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Pipeline + equipo */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand">💰 {t.oppsPipeline}</h2>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-soft p-3 text-center">
              <p className="text-2xl font-bold text-ok">{money(potencial)}</p>
              <p className="text-[11px] text-muted">{t.totalPotential}</p>
            </div>
            <div className="rounded-xl bg-soft p-3 text-center">
              <p className="text-2xl font-bold text-brand">{oppsAbiertas}</p>
              <p className="text-[11px] text-muted">{t.openOpps}</p>
            </div>
          </div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{t.teamSummary}</h3>
          <div className="flex flex-wrap gap-2">
            <Badge tone="ok">{dict.command.estadoEquipo.excelente}: {team.excelente}</Badge>
            <Badge tone="brand">{dict.command.estadoEquipo.normal}: {team.normal}</Badge>
            <Badge tone="danger">{dict.command.estadoEquipo.saturada}: {team.saturada}</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
