"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/executive";
import { Card } from "@/components/ui";
import { getToken, getUser } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { getAgentes, getMensajesStats, getNotificaciones, getProgramaCapacitacion, marcarNotificacionLeida, type Agente, type MensajeInterno, type MensajesStats, type Programa } from "@/lib/queries/gestion";
import { getReunionsPendientesDifusion, type ActaItem } from "@/lib/queries/reuniones";

function getRisk(a: Agente): "ok" | "warning" | "danger" {
  if (a.pct_onboarding >= 80) return "ok";
  if (a.pct_onboarding >= 40) return "warning";
  return "danger";
}

export default function InicioPage() {
  const { locale, t: dict } = useLocale();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("Cecilia");
  const [programa, setPrograma] = useState<Programa | null>(null);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"progress" | "risk" | "name">("risk");
  const [mensajesStats, setMensajesStats] = useState<MensajesStats>({ nuevas: 0, grupos_activos: 0 });
  const [reunionesSinDifundir, setReunionesSinDifundir] = useState<ActaItem[]>([]);
  const [notificaciones, setNotificaciones] = useState<MensajeInterno[]>([]);

  useEffect(() => {
    if (!getToken()) { window.location.href = "/login"; return; }
    const u = getUser();
    setUserName(u?.nombre ?? "Cecilia");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    getMensajesStats().then(setMensajesStats).catch(() => {});
    getReunionsPendientesDifusion().then(setReunionesSinDifundir).catch(() => {});
    getNotificaciones().then(setNotificaciones).catch(() => {});
    Promise.all([getProgramaCapacitacion(locale), getAgentes()]).then(([p, ag]) => {
      setPrograma(p);
      setAgentes(ag.sort((a, b) => b.pct_onboarding - a.pct_onboarding));
    }).catch(() => {});
  }, [ready, locale]);

  if (!ready) return <div className="min-h-screen bg-[#f5f7fb]" />;

  const es = locale === "es";
  const total = agentes.length;
  const completed = agentes.filter((a) => a.pct_onboarding >= 100).length;
  const atRisk = agentes.filter((a) => getRisk(a) === "danger").length;
  const avgPct = total > 0 ? Math.round(agentes.reduce((s, a) => s + a.pct_onboarding, 0) / total) : 0;
  const totalSesiones = agentes.length > 0 ? Math.max(...agentes.map((a) => a.sesiones_registradas)) : 0;

  const filteredAgentes = agentes
    .filter((a) => !search.trim() || `${a.nombre} ${a.apellido ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.nombre.localeCompare(b.nombre);
      if (sortBy === "risk") return a.pct_onboarding - b.pct_onboarding;
      return b.pct_onboarding - a.pct_onboarding;
    });

  const fecha = (s: string | null) => s ? new Date(s).toLocaleDateString(locale, { day: "2-digit", month: "short" }) : "—";

  // Última sesión pasada del calendario de capacitación
  const now = new Date();
  const pastSessions = (programa?.calendario ?? [])
    .filter((k) => k.fecha && new Date(k.fecha) < now)
    .sort((a, b) => new Date(b.fecha!).getTime() - new Date(a.fecha!).getTime());
  const lastSession = pastSessions[0] ?? null;
  const nonAttendees = lastSession ? Math.max(0, total - lastSession.asistentes) : 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">

      {/* ── Header: greeting + program stages ──────────────────────────── */}
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Greeting */}
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-ink">
            {es ? `¡Hola, ${userName}!` : `Hi, ${userName}!`} <span className="text-brand">👋</span>
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {es ? "Centro de control del onboarding comercial" : "Commercial onboarding control center"}
          </p>
          {programa && <p className="mt-0.5 text-xs text-faint">{programa.programa.nombre}</p>}
        </div>

        {/* Program stages stepper — compact, right side */}
        {programa && programa.etapas.length > 0 && (
          <div className="w-full overflow-x-auto lg:max-w-[520px]">
            <ol className="flex min-w-max items-start gap-1">
              {programa.etapas.map((e, i) => {
                const done = e.pct === 100;
                const active = !done && e.en_curso > 0;
                return (
                  <li key={e.id} className="flex items-center">
                    {/* connector line */}
                    {i > 0 && (
                      <span className={`mx-1 h-px w-6 shrink-0 ${done ? "bg-ok" : "bg-line"}`} />
                    )}
                    <div className="flex flex-col items-center text-center" style={{ minWidth: 72 }}>
                      <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                        done ? "bg-ok text-white" : active ? "bg-brand text-white" : "bg-soft text-faint"
                      }`}>
                        {done ? "✓" : e.orden}
                      </span>
                      <p className="mt-1 max-w-[72px] text-[10px] font-medium leading-tight text-ink">{e.nombre}</p>
                      <p className={`text-[10px] font-bold ${done ? "text-ok" : active ? "text-brand" : "text-faint"}`}>
                        {e.pct}%
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </header>

      {/* ── Alerta reuniones sin difundir ──────────────────────────────── */}
      {reunionesSinDifundir.length > 0 && (
        <Link href="/reuniones" className="mb-5 block">
          <div className="flex items-center gap-3 rounded-xl border border-warning/50 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition">
            <span className="text-2xl shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                {es
                  ? `${reunionesSinDifundir.length} reunión${reunionesSinDifundir.length > 1 ? "es" : ""} sin difundir — más de 2 hs`
                  : `${reunionesSinDifundir.length} meeting${reunionesSinDifundir.length > 1 ? "s" : ""} not broadcast yet — 2+ hours ago`}
              </p>
              <p className="text-xs text-amber-600 truncate">
                {reunionesSinDifundir.map((r) => r.titulo).join(", ")}
              </p>
            </div>
            <span className="text-xs font-bold text-warning shrink-0">
              {es ? "Ir a Reuniones →" : "Go to Meetings →"}
            </span>
          </div>
        </Link>
      )}

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-3 lg:grid-cols-6">
        <Link href="/agentes" className="block">
          <Card className="h-full border-t-[3px] border-t-brand p-3 transition hover:shadow-md cursor-pointer">
            <p className="text-xl font-bold text-brand">{total}</p>
            <p className="mt-1 text-[11px] text-muted">{es ? "Agentes" : "Agents"}</p>
            <p className="mt-0.5 text-[9px] text-faint">{es ? "Ver todos →" : "View all →"}</p>
          </Card>
        </Link>
        <Link href="/agentes?sort=progreso&filter=completado" className="block">
          <Card className="h-full border-t-[3px] border-t-ok p-3 transition hover:shadow-md cursor-pointer">
            <p className="text-xl font-bold text-ok">{completed}</p>
            <p className="mt-1 text-[11px] text-muted">{es ? "Completaron" : "Completed"}</p>
            <p className="mt-0.5 text-[9px] text-faint">{es ? "Ver detalle →" : "View detail →"}</p>
          </Card>
        </Link>
        <Link href="/agentes?sort=riesgo" className="block">
          <Card className="h-full border-t-[3px] border-t-danger p-3 transition hover:shadow-md cursor-pointer">
            <p className="text-xl font-bold text-danger">{atRisk}</p>
            <p className="mt-1 text-[11px] text-muted">{es ? "En riesgo" : "At risk"}</p>
            <p className="mt-0.5 text-[9px] text-faint">{es ? "Ver detalle →" : "View detail →"}</p>
          </Card>
        </Link>
        <Link href="/agentes?sort=progreso" className="block">
          <Card className="h-full border-t-[3px] border-t-warning p-3 transition hover:shadow-md cursor-pointer">
            <p className="text-xl font-bold text-warning">{avgPct}%</p>
            <p className="mt-1 text-[11px] text-muted">{es ? "Progreso" : "Progress"}</p>
            <p className="mt-0.5 text-[9px] text-faint">{es ? "Ver ranking →" : "View ranking →"}</p>
          </Card>
        </Link>
        <Link href="/reuniones#asistencia" className="block">
          <Card className={`h-full border-t-[3px] p-3 transition hover:shadow-md ${nonAttendees > 0 ? "border-t-danger" : "border-t-ok"}`}>
            <p className={`text-xl font-bold ${nonAttendees > 0 ? "text-danger" : "text-ok"}`}>{nonAttendees}</p>
            <p className="mt-1 text-[11px] text-muted">{es ? "No asistieron" : "Didn't attend"}</p>
            {lastSession && (
              <p className="mt-0.5 truncate text-[10px] text-faint">{lastSession.nombre}</p>
            )}
          </Card>
        </Link>
        <Link href="/mensajes" className="block">
          <Card className={`h-full border-t-[3px] p-3 transition hover:shadow-md ${mensajesStats.nuevas > 0 ? "border-t-brand" : "border-t-ok"}`}>
            <p className={`text-xl font-bold ${mensajesStats.nuevas > 0 ? "text-brand" : "text-ok"}`}>{mensajesStats.nuevas}</p>
            <p className="mt-1 text-[11px] text-muted">{es ? "Conv. pendientes" : "Pending conv."}</p>
            {mensajesStats.grupos_activos > 0 && (
              <p className="mt-0.5 text-[10px] text-faint">{mensajesStats.grupos_activos} {es ? "grupos" : "groups"}</p>
            )}
          </Card>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">

        {/* ── Agent progress table ─────────────────────────────────────── */}
        <Card className="overflow-hidden p-0">
          {/* Table header + search */}
          <div className="flex flex-col gap-2 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand">
              👥 {es ? "Progreso por agente" : "Progress by agent"}
            </h2>
            <div className="flex gap-2">
              {/* Search */}
              <div className="relative w-44">
                <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={es ? "Buscar agente…" : "Search agent…"}
                  className="w-full rounded-lg border border-line bg-soft py-1.5 pl-8 pr-7 text-xs text-ink placeholder:text-faint focus:border-brand focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink">✕</button>
                )}
              </div>
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-lg border border-line bg-soft py-1.5 pl-2 pr-6 text-xs text-ink focus:border-brand focus:outline-none"
              >
                <option value="progress">{es ? "↓ Progreso" : "↓ Progress"}</option>
                <option value="risk">{es ? "⚠ Riesgo" : "⚠ Risk"}</option>
                <option value="name">{es ? "A→Z Nombre" : "A→Z Name"}</option>
              </select>
            </div>
          </div>

          {agentes.length === 0 && <div className="px-5 py-8 text-center text-sm text-muted">…</div>}

          {filteredAgentes.length === 0 && search && (
            <div className="px-5 py-6 text-center text-sm text-muted">
              {es ? `Sin resultados para "${search}"` : `No results for "${search}"`}
            </div>
          )}

          <ul className="divide-y divide-line">
            {filteredAgentes.map((a) => {
              const risk = getRisk(a);
              const fullName = `${a.nombre}${a.apellido ? " " + a.apellido : ""}`;
              const pctAsistencia = totalSesiones > 0 ? Math.round((a.sesiones_asistidas / totalSesiones) * 100) : 0;
              const isAtRisk = risk === "danger";
              return (
                <li key={a.id} className={`px-5 py-3.5 ${isAtRisk ? "bg-amber-50/30" : ""}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">

                    {/* Col 1: Identidad */}
                    <div className="flex min-w-0 items-center gap-2.5 sm:w-40">
                      <Avatar name={fullName} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{fullName}</p>
                        {a.celular && (
                          <a href={`tel:${a.celular}`} className="block truncate text-[11px] text-brand hover:underline">
                            📱 {a.celular}
                          </a>
                        )}
                        {(a.ciudad || a.region) && (
                          <p className="truncate text-[10px] text-faint">📍 {[a.ciudad, a.region].filter(Boolean).join(", ")}</p>
                        )}
                      </div>
                    </div>

                    {/* Col 2: Onboarding */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">{es ? "Onboarding" : "Onboarding"}</p>
                      <p className="truncate text-[11px] text-muted">
                        {a.etapa_actual ?? (a.pct_onboarding >= 100 ? (es ? "Finalizado" : "Finished") : (es ? "Sin iniciar" : "Not started"))}
                      </p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-soft">
                        <div
                          className={`h-full rounded-full transition-all ${risk === "ok" ? "bg-ok" : risk === "warning" ? "bg-warning" : "bg-danger"}`}
                          style={{ width: `${a.pct_onboarding}%` }}
                        />
                      </div>
                      <p className={`mt-0.5 text-[10px] font-semibold ${risk === "ok" ? "text-ok" : risk === "warning" ? "text-warning" : "text-danger"}`}>
                        {a.pct_onboarding}%
                      </p>
                    </div>

                    {/* Col 3: Asistencia */}
                    <div className="w-28 shrink-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">{es ? "Asistencia" : "Attendance"}</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-soft">
                        <div
                          className={`h-full rounded-full ${pctAsistencia >= 80 ? "bg-ok" : pctAsistencia >= 50 ? "bg-warning" : "bg-danger"}`}
                          style={{ width: `${pctAsistencia}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-ink">
                        {pctAsistencia}% <span className="text-faint">({a.sesiones_asistidas}/{totalSesiones})</span>
                      </p>
                      {a.ultima_sesion_fecha && (
                        <p className="text-[10px] text-faint">↩ {fecha(a.ultima_sesion_fecha)}</p>
                      )}
                      {a.sesiones_faltadas > 0 && (
                        <p className="text-[10px] font-semibold text-danger">✗ {a.sesiones_faltadas} {es ? "faltó" : "missed"}</p>
                      )}
                    </div>

                    {/* Col 4: Actividad */}
                    <div className="w-20 shrink-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">{es ? "Actividad" : "Activity"}</p>
                      {a.cerrados > 0 && (
                        <p className="text-[11px] font-semibold text-ok">
                          {a.cerrados} {es ? `cierre${a.cerrados !== 1 ? "s" : ""}` : `close${a.cerrados !== 1 ? "s" : ""}`}
                        </p>
                      )}
                      {a.abiertas > 0 ? (
                        <p className={`text-[11px] ${a.abiertas >= 5 ? "font-semibold text-danger" : "text-muted"}`}>
                          {a.abiertas} {es ? "pend." : "open"}{a.abiertas >= 5 ? " ⚠" : ""}
                        </p>
                      ) : null}
                      {a.cerrados === 0 && a.abiertas === 0 && (
                        <p className="text-[11px] text-faint">—</p>
                      )}
                    </div>

                    {/* Col 5: Simulador */}
                    <div className="w-24 shrink-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">{es ? "Simulador" : "Simulator"}</p>
                      {a.total_simulaciones === 0 ? (
                        <p className="text-[11px] font-semibold text-danger">{es ? "Nunca usó" : "Never used"}</p>
                      ) : (
                        <>
                          <p className="text-[11px] font-semibold text-ink">{a.total_simulaciones} {es ? "sim." : "sim."}</p>
                          {a.puntaje_simulador !== null && (
                            <p className={`text-[11px] font-semibold ${a.puntaje_simulador >= 70 ? "text-ok" : a.puntaje_simulador >= 50 ? "text-warning" : "text-danger"}`}>
                              {a.puntaje_simulador}% avg
                            </p>
                          )}
                          {a.escenario_favorito && (
                            <p className="text-[10px] text-faint truncate">{a.escenario_favorito}</p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Ver → */}
                    <Link
                      href="/agentes"
                      className="shrink-0 self-center rounded-md border border-line px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-soft"
                    >
                      {es ? "Ver →" : "View →"}
                    </Link>
                  </div>

                  {/* Inline alert for at-risk */}
                  {isAtRisk && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-md border border-danger/30 bg-red-50 px-2.5 py-1.5">
                      <span className="text-xs">⚠️</span>
                      <span className="text-xs text-danger">{es ? "Progreso bajo — necesita seguimiento" : "Low progress — needs follow-up"}</span>
                      {a.celular && (
                        <a href={`tel:${a.celular}`}
                          className="ml-auto shrink-0 rounded bg-danger px-2 py-0.5 text-[10px] font-bold text-white hover:opacity-90">
                          {es ? "Llamar" : "Call"}
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="space-y-4">
          {/* Upcoming sessions + session alerts */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">📅 {es ? "Próximas sesiones" : "Upcoming sessions"}</h2>
            {programa && programa.calendario.length > 0 ? (
              <ul className="space-y-2">
                {programa.calendario.slice(0, 5).map((k) => {
                  const hasAlert = programa.alertas.some((a) => a.titulo.toLowerCase().includes(k.nombre.toLowerCase()));
                  return (
                    <li key={k.id} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${hasAlert ? "border-warning/40 bg-amber-50" : "border-line"}`}>
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-center">
                        <span className="text-[10px] font-bold leading-tight text-brand">{fecha(k.fecha)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-ink">{k.nombre}</p>
                        <p className="text-[11px] text-muted">
                          👥 {k.asistentes > 0 ? k.asistentes : (es ? "Sin confirmados ⚠️" : "No attendees ⚠️")}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">{es ? "Sin sesiones programadas" : "No sessions scheduled"}</p>
            )}
            <Link href="/reuniones" className="mt-3 block text-xs font-semibold text-brand hover:underline">
              {es ? "Ver reuniones →" : "View meetings →"}
            </Link>
          </Card>

          {/* Notificaciones — resúmenes de reuniones recibidos */}
          {notificaciones.length > 0 && (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-brand">
                  🔔 {es ? "Resúmenes recibidos" : "Received summaries"}
                </h2>
                {notificaciones.filter((n) => !n.leido).length > 0 && (
                  <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-white">
                    {notificaciones.filter((n) => !n.leido).length}
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {notificaciones.slice(0, 5).map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-lg border px-3 py-2 text-xs cursor-pointer transition hover:bg-soft ${!n.leido ? "border-brand/30 bg-brand/5" : "border-line"}`}
                    onClick={async () => {
                      if (!n.leido) {
                        await marcarNotificacionLeida(n.id).catch(() => {});
                        setNotificaciones((prev) => prev.map((x) => x.id === n.id ? { ...x, leido: true } : x));
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold text-ink truncate">{n.titulo ?? (es ? "Resumen de reunión" : "Meeting summary")}</p>
                      {!n.leido && <span className="shrink-0 rounded-full bg-brand px-1.5 py-px text-[8px] font-bold text-white">NEW</span>}
                    </div>
                    {n.reunion_titulo && <p className="text-faint mt-0.5 truncate">{n.reunion_titulo}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

        </aside>
      </div>
    </div>
  );
}
