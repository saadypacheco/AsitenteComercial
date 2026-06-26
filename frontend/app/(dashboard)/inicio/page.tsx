"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar, Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { getToken, getUser } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { getAgentes, getProgramaCapacitacion, type Agente, type Programa } from "@/lib/queries/gestion";

type AgentRow = {
  nombre: string;
  pct: number;
  etapa_actual: string | null;
  completados: number;
  // from Agente
  celular: string | null;
  cerrados: number;
  estado: string;
};

type Status = "completed" | "on_track" | "at_risk" | "never_started";

function getStatus(row: AgentRow): Status {
  if (row.pct >= 100) return "completed";
  if (row.pct === 0 && row.completados === 0) return "never_started";
  if (row.pct < 30) return "at_risk";
  return "on_track";
}

const STATUS_TONE: Record<Status, "ok" | "brand" | "warning" | "danger"> = {
  completed: "ok",
  on_track: "brand",
  at_risk: "warning",
  never_started: "danger",
};

export default function InicioPage() {
  const { locale, t: dict } = useLocale();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("Cecilia");
  const [programa, setPrograma] = useState<Programa | null>(null);
  const [agentesData, setAgentesData] = useState<Agente[]>([]);
  const [rows, setRows] = useState<AgentRow[]>([]);

  useEffect(() => {
    if (!getToken()) { window.location.href = "/login"; return; }
    const u = getUser();
    setUserName(u?.nombre ?? "Cecilia");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    Promise.all([getProgramaCapacitacion(locale), getAgentes()]).then(([p, ag]) => {
      setPrograma(p);
      setAgentesData(ag);
      // Join by nombre (best available key)
      const agMap = new Map(ag.map((a) => [`${a.nombre} ${a.apellido ?? ""}`.trim().toLowerCase(), a]));
      const r: AgentRow[] = p.agentes.map((pa) => {
        const match = agMap.get(pa.nombre.toLowerCase()) ?? ag.find((a) => a.nombre.toLowerCase() === pa.nombre.split(" ")[0].toLowerCase());
        return {
          nombre: pa.nombre,
          pct: pa.pct,
          etapa_actual: pa.etapa_actual,
          completados: pa.completados,
          celular: match?.celular ?? null,
          cerrados: match?.cerrados ?? 0,
          estado: match?.estado ?? "activo",
        };
      });
      setRows(r.sort((a, b) => b.pct - a.pct));
    }).catch(() => {});
  }, [ready, locale]);

  if (!ready) return <div className="min-h-screen bg-[#f5f7fb]" />;

  const total = rows.length;
  const completed = rows.filter((r) => getStatus(r) === "completed").length;
  const atRisk = rows.filter((r) => ["at_risk", "never_started"].includes(getStatus(r))).length;
  const avgPct = total > 0 ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / total) : 0;

  const labelEs = locale === "es";
  const L = {
    hello: labelEs ? `¡Hola, ${userName}!` : `Hi, ${userName}!`,
    subtitle: labelEs ? "Centro de control del onboarding comercial" : "Commercial onboarding control center",
    kpiTotal: labelEs ? "Agentes en onboarding" : "Agents in onboarding",
    kpiCompleted: labelEs ? "Completaron el path" : "Completed path",
    kpiAtRisk: labelEs ? "En riesgo / sin iniciar" : "At risk / not started",
    kpiAvg: labelEs ? "Progreso promedio" : "Avg. progress",
    tableTitle: labelEs ? "Progreso por agente" : "Progress by agent",
    colAgent: labelEs ? "Agente" : "Agent",
    colStage: labelEs ? "Etapa actual" : "Current stage",
    colProgress: labelEs ? "Progreso" : "Progress",
    colFirstClient: labelEs ? "Primer cliente" : "First client",
    colStatus: labelEs ? "Estado" : "Status",
    statusLabels: {
      completed: labelEs ? "Completado" : "Completed",
      on_track: labelEs ? "En camino" : "On track",
      at_risk: labelEs ? "En riesgo" : "At risk",
      never_started: labelEs ? "Sin iniciar" : "Never started",
    } as Record<Status, string>,
    firstClientDone: (n: number) => labelEs ? `${n} cierre${n !== 1 ? "s" : ""}` : `${n} close${n !== 1 ? "s" : ""}`,
    firstClientPending: labelEs ? "Pendiente" : "Pending",
    sessionsTitle: labelEs ? "Próximas sesiones" : "Upcoming sessions",
    alertsTitle: labelEs ? "Alertas" : "Alerts",
    noSessions: labelEs ? "Sin sesiones programadas" : "No sessions scheduled",
    noAlerts: labelEs ? "Sin alertas" : "No alerts",
    chatLink: labelEs ? "Hacer una consulta a la IA →" : "Ask the AI →",
    navAgentes: labelEs ? "Ver directorio de agentes →" : "View agent directory →",
  };

  const fecha = (s: string | null) => s ? new Date(s).toLocaleDateString(locale, { day: "2-digit", month: "short" }) : "—";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">{L.hello} <span className="text-brand">👋</span></h1>
        <p className="mt-0.5 text-sm text-muted">{L.subtitle}</p>
        {programa && <p className="mt-0.5 text-xs text-faint">{programa.programa.nombre}</p>}
      </header>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-t-[3px] border-t-brand p-4">
          <p className="text-2xl font-bold text-brand">{total}</p>
          <p className="mt-1 text-xs text-muted">{L.kpiTotal}</p>
        </Card>
        <Card className="border-t-[3px] border-t-ok p-4">
          <p className="text-2xl font-bold text-ok">{completed}</p>
          <p className="mt-1 text-xs text-muted">{L.kpiCompleted}</p>
        </Card>
        <Card className="border-t-[3px] border-t-danger p-4">
          <p className="text-2xl font-bold text-danger">{atRisk}</p>
          <p className="mt-1 text-xs text-muted">{L.kpiAtRisk}</p>
        </Card>
        <Card className="border-t-[3px] border-t-warning p-4">
          <p className="text-2xl font-bold text-warning">{avgPct}%</p>
          <p className="mt-1 text-xs text-muted">{L.kpiAvg}</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Main: agent progress table */}
        <div className="space-y-5">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-line px-5 py-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-brand">👥 {L.tableTitle}</h2>
            </div>
            {rows.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted">…</div>
            )}
            <ul className="divide-y divide-line">
              {rows.map((row) => {
                const status = getStatus(row);
                return (
                  <li key={row.nombre} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                    {/* Avatar + name */}
                    <div className="flex min-w-0 items-center gap-3 sm:w-44">
                      <Avatar name={row.nombre} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{row.nombre}</p>
                        {row.celular && (
                          <a href={`tel:${row.celular}`} className="block text-xs text-brand hover:underline">
                            📱 {row.celular}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Stage */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted">
                        {row.etapa_actual ?? (status === "never_started" ? (labelEs ? "Sin iniciar" : "Not started") : (labelEs ? "Finalizado" : "Finished"))}
                      </p>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-soft">
                        <div
                          className={`h-full rounded-full transition-all ${
                            status === "completed" ? "bg-ok" : status === "at_risk" || status === "never_started" ? "bg-warning" : "bg-brand"
                          }`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted">{row.pct}%</p>
                    </div>

                    {/* First client */}
                    <div className="w-24 shrink-0 text-right">
                      {row.cerrados > 0 ? (
                        <span className="text-xs font-semibold text-ok">{L.firstClientDone(row.cerrados)}</span>
                      ) : (
                        <span className="text-xs text-faint">{L.firstClientPending}</span>
                      )}
                      <p className="text-[10px] text-faint">{L.colFirstClient}</p>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      <Badge tone={STATUS_TONE[status]}>{L.statusLabels[status]}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Stage stepper */}
          {programa && programa.etapas.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand">
                {labelEs ? "Etapas del programa" : "Program stages"}
              </h2>
              <ol className="flex gap-2 overflow-x-auto pb-1">
                {programa.etapas.map((e, i) => {
                  const done = e.pct === 100;
                  return (
                    <li key={e.id} className="flex min-w-[120px] flex-1 flex-col items-center text-center">
                      <div className="flex w-full items-center">
                        <span className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : done ? "bg-ok" : "bg-line"}`} />
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                          done ? "bg-ok text-white" : e.en_curso > 0 ? "bg-brand text-white" : "bg-soft text-faint"
                        }`}>
                          {done ? "✓" : e.orden}
                        </span>
                        <span className={`h-0.5 flex-1 ${i === programa.etapas.length - 1 ? "bg-transparent" : done ? "bg-ok" : "bg-line"}`} />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-ink">{e.nombre}</p>
                      <p className="text-[11px] text-muted">{e.completados}/{e.completados + e.en_curso + e.pendientes} · {e.pct}%</p>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Upcoming sessions */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">📅 {L.sessionsTitle}</h2>
            {programa && programa.calendario.length > 0 ? (
              <ul className="space-y-2">
                {programa.calendario.slice(0, 5).map((k) => (
                  <li key={k.id} className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-center">
                      <span className="text-[10px] font-bold leading-tight text-brand">{fecha(k.fecha)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink">{k.nombre}</p>
                      <p className="text-[11px] text-muted">👥 {k.asistentes}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{L.noSessions}</p>
            )}
            <Link href="/reuniones" className="mt-3 block text-xs font-semibold text-brand hover:underline">
              {labelEs ? "Ver reuniones →" : "View meetings →"}
            </Link>
          </Card>

          {/* Alerts */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-warning">🔔 {L.alertsTitle}</h2>
            {programa && programa.alertas.length > 0 ? (
              <ul className="space-y-2">
                {programa.alertas.map((a, i) => (
                  <li key={i} className="rounded-lg border border-line border-l-4 border-l-warning bg-white px-3 py-2">
                    <p className="text-xs font-semibold text-ink">{a.titulo}</p>
                    <p className="text-[11px] text-muted">{a.detalle}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{L.noAlerts}</p>
            )}
          </Card>

          {/* Quick links */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">
              {labelEs ? "Accesos rápidos" : "Quick access"}
            </h2>
            <div className="space-y-2">
              <Link href="/chat" className="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2.5 text-sm font-semibold text-brand hover:opacity-90">
                💬 {L.chatLink}
              </Link>
              <Link href="/agentes" className="flex items-center gap-2 rounded-lg bg-soft px-3 py-2.5 text-sm font-medium text-muted hover:bg-line">
                👥 {L.navAgentes}
              </Link>
              <Link href="/simulador" className="flex items-center gap-2 rounded-lg bg-soft px-3 py-2.5 text-sm font-medium text-muted hover:bg-line">
                🎯 {labelEs ? "Ir al simulador →" : "Open simulator →"}
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
