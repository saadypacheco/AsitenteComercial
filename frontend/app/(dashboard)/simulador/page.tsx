"use client";

import { useEffect, useState } from "react";

import { Avatar } from "@/components/executive";
import { Card } from "@/components/ui";
import { getToken } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { getSimuladorStats, patchEscenario, type EscenarioStats, type SimuladorStats } from "@/lib/queries/gestion";

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 70 ? "bg-ok" : pct >= 50 ? "bg-warning" : "bg-danger";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-soft">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] font-semibold ${pct >= 70 ? "text-ok" : pct >= 50 ? "text-warning" : "text-danger"}`}>
        {value}%
      </span>
    </div>
  );
}

function EscenarioCard({
  e,
  totalAgentes,
  es,
  onToggle,
  toggling,
}: {
  e: EscenarioStats;
  totalAgentes: number;
  es: boolean;
  onToggle: (e: EscenarioStats) => void;
  toggling: string | null;
}) {
  const [open, setOpen] = useState(true);

  const dif = e.puntaje_promedio === null ? null
    : e.puntaje_promedio < 50 ? { label: es ? "Difícil" : "Hard", color: "text-danger bg-red-50" }
    : e.puntaje_promedio < 70 ? { label: es ? "Medio" : "Medium", color: "text-warning bg-amber-50" }
    : { label: es ? "Fácil" : "Easy", color: "text-ok bg-green-50" };

  return (
    <Card className="overflow-hidden p-0">
      {/* Header del escenario */}
      <div
        className={`flex cursor-pointer items-center gap-3 px-5 py-3.5 transition hover:bg-soft/40 ${!e.activo ? "opacity-60" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-bold text-ink flex-1">{e.nombre}</span>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {dif && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${dif.color}`}>{dif.label}</span>
          )}
          {!e.activo && (
            <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-semibold text-faint">
              {es ? "Desactivado" : "Disabled"}
            </span>
          )}

          {/* % adopción */}
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-soft">
              <div
                className={`h-full rounded-full ${e.pct_adopcion >= 70 ? "bg-ok" : e.pct_adopcion >= 40 ? "bg-warning" : "bg-danger"}`}
                style={{ width: `${e.pct_adopcion}%` }}
              />
            </div>
            <span className={`text-[11px] font-bold ${e.pct_adopcion >= 70 ? "text-ok" : e.pct_adopcion >= 40 ? "text-warning" : "text-danger"}`}>
              {e.pct_adopcion}%
            </span>
            <span className="text-[11px] text-faint">
              ({e.agentes_usaron}/{totalAgentes})
            </span>
          </div>

          {/* Puntaje promedio */}
          {e.puntaje_promedio !== null && (
            <span className={`text-[11px] font-semibold ${e.puntaje_promedio >= 70 ? "text-ok" : e.puntaje_promedio >= 50 ? "text-warning" : "text-danger"}`}>
              ⌀ {e.puntaje_promedio}%
            </span>
          )}

          {/* Total usos */}
          <span className="text-[11px] text-faint">{e.total_usos} {es ? "usos" : "uses"}</span>

          {/* Toggle activo */}
          <button
            onClick={(ev) => { ev.stopPropagation(); onToggle(e); }}
            disabled={toggling === e.clave}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              e.activo
                ? "border border-line text-muted hover:border-danger hover:text-danger"
                : "border border-ok text-ok hover:bg-ok hover:text-white"
            } disabled:opacity-50`}
          >
            {toggling === e.clave ? "…" : e.activo ? (es ? "Desactivar" : "Disable") : (es ? "Activar" : "Enable")}
          </button>

          <span className="text-muted text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Detalle por agente */}
      {open && (
        <div className="border-t border-line">
          {/* Agentes que usaron */}
          {e.agentes.length > 0 && (
            <div className="divide-y divide-line">
              {e.agentes.map((ag) => (
                <div key={ag.agente_id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={ag.nombre} />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{ag.nombre}</p>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[10px] text-faint">{es ? "Usos" : "Uses"}</p>
                      <p className="text-xs font-semibold text-ink">{ag.usos}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-faint">{es ? "Prom." : "Avg."}</p>
                      {ag.puntaje_promedio !== null
                        ? <ScoreBar value={ag.puntaje_promedio} />
                        : <p className="text-xs text-faint">—</p>}
                    </div>
                    <div>
                      <p className="text-[10px] text-faint">{es ? "Último" : "Last"}</p>
                      {ag.ultimo_puntaje !== null
                        ? <ScoreBar value={ag.ultimo_puntaje} />
                        : <p className="text-xs text-faint">—</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Agentes sin práctica */}
          {e.sin_practica.length > 0 && (
            <div className="bg-red-50/40 px-5 py-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
                {es ? "Sin práctica en este escenario" : "No practice in this scenario"}
              </p>
              <div className="flex flex-wrap gap-2">
                {e.sin_practica.map((ag) => (
                  <div key={ag.id} className="flex items-center gap-1.5 rounded-full border border-danger/20 bg-white px-2.5 py-1">
                    <Avatar name={ag.nombre} />
                    <span className="text-[11px] font-medium text-ink">{ag.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {e.agentes.length === 0 && e.sin_practica.length === 0 && (
            <div className="px-5 py-4 text-center text-sm text-faint">
              {es ? "Sin datos todavía" : "No data yet"}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function SimuladorPage() {
  const { locale } = useLocale();
  const es = locale === "es";
  const [stats, setStats] = useState<SimuladorStats | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { window.location.href = "/login"; return; }
    load();
  }, [locale]);

  function load() {
    getSimuladorStats(locale).then(setStats).catch(() => {});
  }

  async function handleToggle(e: EscenarioStats) {
    setToggling(e.clave);
    try {
      await patchEscenario(e.clave, !e.activo);
      setStats((prev) => prev ? {
        ...prev,
        escenarios: prev.escenarios.map((x) => x.clave === e.clave ? { ...x, activo: !e.activo } : x),
      } : prev);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">🎯 {es ? "Simulador de Ventas" : "Sales Simulator"}</h1>
        <p className="mt-1 text-sm text-muted">
          {es
            ? "Seguimiento del uso del simulador por el equipo. Los agentes practican escenarios en la app móvil."
            : "Team simulator usage tracking. Agents practice scenarios in the mobile app."}
        </p>
      </header>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-t-[3px] border-t-brand p-4">
          <p className="text-2xl font-bold text-brand">{stats?.tasa_uso ?? "—"}%</p>
          <p className="mt-1 text-xs text-muted">{es ? "Tasa de uso" : "Usage rate"}</p>
          <p className="mt-0.5 text-[11px] text-faint">
            {stats ? `${stats.agentes_usaron}/${stats.total_agentes} ${es ? "agentes" : "agents"}` : "…"}
          </p>
        </Card>
        <Card className="border-t-[3px] border-t-ok p-4">
          <p className="text-2xl font-bold text-ok">{stats?.total_simulaciones ?? "—"}</p>
          <p className="mt-1 text-xs text-muted">{es ? "Simulaciones totales" : "Total simulations"}</p>
        </Card>
        <Card className={`border-t-[3px] p-4 ${
          stats?.puntaje_promedio != null
            ? stats.puntaje_promedio >= 70 ? "border-t-ok" : stats.puntaje_promedio >= 50 ? "border-t-warning" : "border-t-danger"
            : "border-t-line"
        }`}>
          <p className={`text-2xl font-bold ${
            stats?.puntaje_promedio != null
              ? stats.puntaje_promedio >= 70 ? "text-ok" : stats.puntaje_promedio >= 50 ? "text-warning" : "text-danger"
              : "text-muted"
          }`}>
            {stats?.puntaje_promedio != null ? `${stats.puntaje_promedio}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">{es ? "Puntaje promedio" : "Avg. score"}</p>
          <p className="mt-0.5 text-[11px] text-faint">{es ? "del equipo" : "team-wide"}</p>
        </Card>
        <Card className={`border-t-[3px] p-4 ${stats && stats.total_agentes - stats.agentes_usaron > 0 ? "border-t-danger" : "border-t-ok"}`}>
          <p className={`text-2xl font-bold ${stats && stats.total_agentes - stats.agentes_usaron > 0 ? "text-danger" : "text-ok"}`}>
            {stats ? stats.total_agentes - stats.agentes_usaron : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">{es ? "Sin práctica" : "No practice"}</p>
          <p className="mt-0.5 text-[11px] text-faint">{es ? "agentes nunca usaron" : "agents never used"}</p>
        </Card>
      </div>

      {/* Escenarios */}
      {!stats && <div className="py-12 text-center text-sm text-muted">…</div>}

      <div className="space-y-4">
        {(stats?.escenarios ?? []).map((e) => (
          <EscenarioCard
            key={e.clave}
            e={e}
            totalAgentes={stats?.total_agentes ?? 0}
            es={es}
            onToggle={handleToggle}
            toggling={toggling}
          />
        ))}
      </div>

      {stats && stats.escenarios.length === 0 && (
        <div className="py-12 text-center text-sm text-muted">
          {es ? "Sin escenarios configurados" : "No scenarios configured"}
        </div>
      )}
    </div>
  );
}
