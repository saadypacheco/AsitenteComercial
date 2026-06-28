"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AgentTree } from "@/components/agent-tree";
import { Avatar, Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import {
  bajaAgente,
  createAgente,
  designarLider,
  getAgentes,
  quitarLider,
  updateAgente,
  type Agente,
  type AgenteInput,
} from "@/lib/queries/gestion";

const AgentMap = dynamic(() => import("@/components/agent-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">…</div>,
});

const EMPTY: AgenteInput = {
  nombre: "", apellido: "", celular: "", email: "", ciudad: "",
  region: "", superior_id: "", estado: "activo", lat: null, lng: null,
};

type SortKey = "nombre" | "progreso" | "asistencia" | "riesgo" | "deals";
type FilterEstado = "todos" | "activo" | "inactivo";

function getRisk(a: Agente): "ok" | "warning" | "danger" {
  if (a.pct_onboarding >= 80) return "ok";
  if (a.pct_onboarding === 0) return "danger";
  if (a.pct_onboarding < 40) return "danger";
  return "warning";
}

function getPctAsistencia(a: Agente, totalSesiones: number): number {
  if (totalSesiones === 0) return 0;
  return Math.round((a.sesiones_asistidas / totalSesiones) * 100);
}

export default function AgentesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f7fb]" />}>
      <AgentesContent />
    </Suspense>
  );
}

function AgentesContent() {
  const { t: dict, locale } = useLocale();
  const t = dict.gestion;
  const es = locale === "es";
  const params = useSearchParams();
  const listaRef = useRef<HTMLDivElement>(null);

  const [agentes, setAgentes] = useState<Agente[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AgenteInput>(EMPTY);
  const [view, setView] = useState<"lista" | "jerarquia">("lista");
  const [isOwner, setIsOwner] = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("nombre");
  const [filterEstado, setFilterEstado] = useState<FilterEstado>("todos");
  const [filterProgreso, setFilterProgreso] = useState<"todos" | "completado" | "riesgo">("todos");

  useEffect(() => setIsOwner(getUser()?.alcance === "todo"), []);

  // Leer query params de home (sort=, filter=)
  useEffect(() => {
    const sort = params.get("sort") as SortKey | null;
    const filter = params.get("filter");
    if (sort && ["nombre", "progreso", "asistencia", "riesgo", "deals"].includes(sort)) setSortBy(sort);
    if (filter === "completado" || filter === "riesgo") setFilterProgreso(filter);
    if (sort || filter) {
      setTimeout(() => listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, [params]);

  function reload() {
    getAgentes().then(setAgentes).catch(() => setAgentes([]));
  }
  useEffect(reload, []);

  async function toggleLider(a: Agente) {
    setBusy(true);
    if (a.es_lider) {
      await quitarLider(a.id).catch(() => {});
    } else {
      const r = await designarLider(a.id).catch(() => null);
      if (r) alert(`✅ ${r.email} ${t.agLiderDone}`);
    }
    reload();
    setBusy(false);
  }

  function startNew() { setEditId(null); setForm(EMPTY); setOpen(true); }
  function startEdit(a: Agente) {
    setEditId(a.id);
    setForm({
      nombre: a.nombre, apellido: a.apellido ?? "", celular: a.celular ?? "",
      email: a.email ?? "", ciudad: a.ciudad ?? "", region: a.region ?? "",
      superior_id: a.superior_id ?? "", estado: a.estado, lat: a.lat, lng: a.lng,
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setBusy(true);
    const body = { ...form, superior_id: form.superior_id || null };
    if (editId) await updateAgente(editId, body).catch(() => {});
    else await createAgente(body).catch(() => {});
    setOpen(false);
    reload();
    setBusy(false);
  }

  async function darBaja(a: Agente) {
    if (!confirm(`${t.agConfirmBaja}`)) return;
    setBusy(true);
    await bajaAgente(a.id).catch(() => {});
    reload();
    setBusy(false);
  }

  const inputCls = "w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none";
  const conMapa = agentes?.filter((a) => a.lat != null && a.lng != null).length ?? 0;

  // Total sesiones pasadas (el mayor sesiones_registradas entre todos los agentes)
  const totalSesiones = useMemo(() =>
    Math.max(0, ...(agentes ?? []).map((a) => a.sesiones_registradas)),
    [agentes]
  );

  const filtered = useMemo(() => {
    if (!agentes) return [];
    return agentes
      .filter((a) => {
        if (filterEstado !== "todos" && a.estado !== filterEstado) return false;
        if (filterProgreso === "completado" && a.pct_onboarding < 100) return false;
        if (filterProgreso === "riesgo" && getRisk(a) === "ok") return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          a.nombre.toLowerCase().includes(q) ||
          (a.apellido ?? "").toLowerCase().includes(q) ||
          (a.celular ?? "").includes(q) ||
          (a.email ?? "").toLowerCase().includes(q) ||
          (a.ciudad ?? "").toLowerCase().includes(q) ||
          (a.etapa_actual ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "progreso") return b.pct_onboarding - a.pct_onboarding;
        if (sortBy === "asistencia") return getPctAsistencia(b, totalSesiones) - getPctAsistencia(a, totalSesiones);
        if (sortBy === "deals") return b.cerrados - a.cerrados;
        if (sortBy === "riesgo") {
          const order = { danger: 0, warning: 1, ok: 2 };
          return order[getRisk(a)] - order[getRisk(b)];
        }
        return a.nombre.localeCompare(b.nombre);
      });
  }, [agentes, search, sortBy, filterEstado, filterProgreso, totalSesiones]);

  function applyFilter(opts: { sort?: SortKey; estado?: FilterEstado; progreso?: "todos" | "completado" | "riesgo" }) {
    if (opts.sort) setSortBy(opts.sort);
    if (opts.estado) setFilterEstado(opts.estado);
    if (opts.progreso !== undefined) setFilterProgreso(opts.progreso);
    setTimeout(() => listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  const fDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString(locale, { day: "2-digit", month: "short" }) : "—";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">{dict.inicio.nav.agentes}</h1>
        <button onClick={startNew} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card">
          + {t.newBtn}
        </button>
      </div>

      {/* KPI cards — clickables para filtrar */}
      {agentes && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button onClick={() => applyFilter({ sort: "nombre", estado: "todos", progreso: "todos" })} className="text-left">
            <Card className={`h-full border-t-[3px] border-t-brand p-4 transition hover:shadow-md cursor-pointer ${filterEstado === "todos" && filterProgreso === "todos" && sortBy === "nombre" ? "ring-2 ring-brand/30" : ""}`}>
              <p className="text-2xl font-bold text-brand">{agentes.length}</p>
              <p className="text-[11px] text-muted">{t.agCount}</p>
              <p className="mt-0.5 text-[9px] text-faint">{es ? "Ver todos →" : "View all →"}</p>
            </Card>
          </button>
          <button onClick={() => applyFilter({ sort: "nombre", estado: "activo", progreso: "todos" })} className="text-left">
            <Card className={`h-full border-t-[3px] border-t-ok p-4 transition hover:shadow-md cursor-pointer ${filterEstado === "activo" ? "ring-2 ring-ok/30" : ""}`}>
              <p className="text-2xl font-bold text-ok">{agentes.filter((a) => a.estado === "activo").length}</p>
              <p className="text-[11px] text-muted">{t.agActivos}</p>
              <p className="mt-0.5 text-[9px] text-faint">{es ? "Filtrar activos →" : "Filter active →"}</p>
            </Card>
          </button>
          <button onClick={() => applyFilter({ sort: "riesgo", estado: "todos", progreso: "todos" })} className="text-left">
            <Card className={`h-full border-t-[3px] border-t-danger p-4 transition hover:shadow-md cursor-pointer ${sortBy === "riesgo" ? "ring-2 ring-danger/30" : ""}`}>
              <p className="text-2xl font-bold text-danger">{agentes.filter((a) => getRisk(a) === "danger").length}</p>
              <p className="text-[11px] text-muted">{es ? "En riesgo" : "At risk"}</p>
              <p className="mt-0.5 text-[9px] text-faint">{es ? "Ver en riesgo →" : "View at risk →"}</p>
            </Card>
          </button>
          <button onClick={() => applyFilter({ sort: "asistencia", estado: "todos", progreso: "todos" })} className="text-left">
            <Card className={`h-full border-t-[3px] border-t-warning p-4 transition hover:shadow-md cursor-pointer ${sortBy === "asistencia" ? "ring-2 ring-warning/30" : ""}`}>
              <p className="text-2xl font-bold text-warning">
                {totalSesiones > 0
                  ? `${Math.round(agentes.reduce((s, a) => s + getPctAsistencia(a, totalSesiones), 0) / agentes.length)}%`
                  : "—"}
              </p>
              <p className="text-[11px] text-muted">{es ? "Asistencia promedio" : "Avg. attendance"}</p>
              <p className="mt-0.5 text-[9px] text-faint">{es ? "Ordenar por asist. →" : "Sort by attendance →"}</p>
            </Card>
          </button>
        </div>
      )}

      {/* Form alta/edición */}
      {open && (
        <Card className="mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{editId ? t.agEdit : t.agNew}</h2>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <Field label={t.fNombre}><input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} autoFocus className={inputCls} /></Field>
            <Field label={t.fApellido}><input value={form.apellido ?? ""} onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))} className={inputCls} /></Field>
            <Field label={t.fCelular}><input value={form.celular ?? ""} onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))} className={inputCls} /></Field>
            <Field label={t.fEmail}><input value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} /></Field>
            <Field label={t.fCiudad}><input value={form.ciudad ?? ""} onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))} className={inputCls} /></Field>
            <Field label={t.fRegion}><input value={form.region ?? ""} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} className={inputCls} /></Field>
            <Field label={t.fSuperior}>
              <select value={form.superior_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, superior_id: e.target.value }))} className={inputCls}>
                <option value="">{t.noSuperior}</option>
                {agentes?.filter((a) => a.id !== editId).map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre} {a.apellido ?? ""}</option>
                ))}
              </select>
            </Field>
            <Field label={t.fEstado}>
              <select value={form.estado ?? "activo"} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))} className={inputCls}>
                <option value="activo">{t.estadoAgente.activo}</option>
                <option value="inactivo">{t.estadoAgente.inactivo}</option>
              </select>
            </Field>
            <Field label={t.fLat}><input type="number" step="any" value={form.lat ?? ""} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value === "" ? null : Number(e.target.value) }))} className={inputCls} /></Field>
            <Field label={t.fLng}><input type="number" step="any" value={form.lng ?? ""} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value === "" ? null : Number(e.target.value) }))} className={inputCls} /></Field>
            <div className="col-span-2 flex gap-2 pt-1">
              <button type="submit" disabled={busy || !form.nombre.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? t.saving : t.save}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted">{t.cancel}</button>
            </div>
          </form>
        </Card>
      )}

      {/* Vista tabs */}
      <div className="mb-4 flex gap-2">
        {(["lista", "jerarquia"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${view === v ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-soft"}`}>
            {v === "lista" ? t.agViewList : t.agViewTree}
          </button>
        ))}
      </div>

      {/* ── Vista jerarquía ──────────────────────────────────────────────── */}
      {view === "jerarquia" && agentes && (
        <Card className="p-4">
          <AgentTree agentes={agentes} labels={{ activo: t.estadoAgente.activo, inactivo: t.estadoAgente.inactivo, saturada: t.agSaturada }} />
        </Card>
      )}

      {/* ── Vista lista enriquecida ──────────────────────────────────────── */}
      {view === "lista" && (
        <div ref={listaRef}>
        <Card className="overflow-hidden p-0">
          {/* Barra de filtros */}
          <div className="flex flex-col gap-2 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={es ? "Buscar agente…" : "Search agent…"}
                className="w-full rounded-lg border border-line bg-soft py-1.5 pl-8 pr-7 text-xs text-ink focus:border-brand focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">✕</button>
              )}
            </div>

            <div className="flex gap-2">
              {/* Filtro estado */}
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value as FilterEstado)}
                className="rounded-lg border border-line bg-soft py-1.5 pl-2 pr-6 text-xs text-ink focus:border-brand focus:outline-none"
              >
                <option value="todos">{es ? "Todos" : "All"}</option>
                <option value="activo">{t.estadoAgente.activo}</option>
                <option value="inactivo">{t.estadoAgente.inactivo}</option>
              </select>
              {/* Ordenar */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="rounded-lg border border-line bg-soft py-1.5 pl-2 pr-6 text-xs text-ink focus:border-brand focus:outline-none"
              >
                <option value="nombre">{es ? "A→Z Nombre" : "A→Z Name"}</option>
                <option value="progreso">{es ? "↓ Progreso" : "↓ Progress"}</option>
                <option value="asistencia">{es ? "↓ Asistencia" : "↓ Attendance"}</option>
                <option value="riesgo">{es ? "⚠ Riesgo" : "⚠ Risk"}</option>
                <option value="deals">{es ? "↓ Cierres" : "↓ Deals"}</option>
              </select>
            </div>
          </div>

          {/* Cabecera de columnas */}
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-line bg-soft/60 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted sm:grid">
            <span>{es ? "Agente" : "Agent"}</span>
            <span>{es ? "Onboarding" : "Onboarding"}</span>
            <span>{es ? "Asistencia" : "Attendance"}</span>
            <span>{es ? "Actividad" : "Activity"}</span>
            <span>{es ? "Acciones" : "Actions"}</span>
          </div>

          {!agentes && (
            <div className="px-5 py-12 text-center text-sm text-muted">{es ? "Cargando…" : "Loading…"}</div>
          )}

          {filtered.length === 0 && agentes && (
            <div className="px-5 py-12 text-center text-sm text-muted">
              {agentes.length === 0 ? t.agEmpty : (es ? `Sin resultados para "${search}"` : `No results for "${search}"`)}
            </div>
          )}

          <ul className="divide-y divide-line">
            {filtered.map((a) => {
              const risk = getRisk(a);
              const pctAsist = getPctAsistencia(a, totalSesiones);
              const riskColor = risk === "ok" ? "text-ok" : risk === "warning" ? "text-warning" : "text-danger";
              const riskBg = risk === "ok" ? "bg-ok" : risk === "warning" ? "bg-warning" : "bg-danger";

              return (
                <li key={a.id} className={`px-5 py-4 transition hover:bg-soft/30 ${risk === "danger" ? "bg-red-50/20" : ""}`}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">

                    {/* Col 1: Identidad */}
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar name={`${a.nombre} ${a.apellido ?? ""}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-semibold text-ink">{a.nombre} {a.apellido ?? ""}</p>
                          {a.es_lider && <Badge tone="brand">★ {t.agLiderBadge}</Badge>}
                          <Badge tone={a.estado === "activo" ? "ok" : "warning"}>
                            {a.estado === "activo" ? t.estadoAgente.activo : t.estadoAgente.inactivo}
                          </Badge>
                        </div>
                        {(a.ciudad || a.region) && (
                          <p className="mt-0.5 text-xs text-muted">📍 {[a.ciudad, a.region].filter(Boolean).join(", ")}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                          {a.celular && (
                            <a href={`tel:${a.celular}`} className="flex items-center gap-1 text-muted hover:text-brand">
                              📱 {a.celular}
                            </a>
                          )}
                          {a.email && (
                            <a href={`mailto:${a.email}`} className="flex items-center gap-1 truncate max-w-[180px] text-muted hover:text-brand">
                              ✉️ {a.email}
                            </a>
                          )}
                        </div>
                        {a.superior && (
                          <p className="mt-0.5 text-[10px] text-faint">↳ {a.superior}</p>
                        )}
                      </div>
                    </div>

                    {/* Col 2: Onboarding */}
                    <div className="flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${riskColor}`}>{a.pct_onboarding}%</span>
                        {risk === "danger" && <span className="text-[10px] text-danger font-semibold">⚠ riesgo</span>}
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-soft">
                        <div className={`h-full rounded-full transition-all ${riskBg}`} style={{ width: `${a.pct_onboarding}%` }} />
                      </div>
                      <p className="truncate text-[10px] text-muted">
                        {a.etapa_actual ?? (a.pct_onboarding >= 100 ? (es ? "✓ Completado" : "✓ Completed") : (es ? "Sin iniciar" : "Not started"))}
                      </p>
                    </div>

                    {/* Col 3: Asistencia */}
                    <div className="flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${pctAsist >= 80 ? "text-ok" : pctAsist >= 50 ? "text-warning" : "text-danger"}`}>
                          {totalSesiones > 0 ? `${pctAsist}%` : "—"}
                        </span>
                        <span className="text-[10px] text-muted">{a.sesiones_asistidas}/{totalSesiones}</span>
                      </div>
                      {totalSesiones > 0 && (
                        <div className="h-2 w-full overflow-hidden rounded-full bg-soft">
                          <div
                            className={`h-full rounded-full transition-all ${pctAsist >= 80 ? "bg-ok" : pctAsist >= 50 ? "bg-warning" : "bg-danger"}`}
                            style={{ width: `${pctAsist}%` }}
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-px">
                        <p className="text-[10px] text-muted">
                          {a.ultima_sesion_fecha
                            ? (es ? `Última: ${fDate(a.ultima_sesion_fecha)}` : `Last: ${fDate(a.ultima_sesion_fecha)}`)
                            : (es ? "Sin asistencia" : "No attendance")}
                        </p>
                        {a.sesiones_faltadas > 0 && (
                          <p className="text-[10px] font-semibold text-danger">
                            ✗ {a.sesiones_faltadas} {es ? "faltó" : "missed"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Col 4: Actividad */}
                    <div className="flex flex-col justify-center gap-1.5">
                      <div className="flex items-center gap-3 text-xs">
                        <span>
                          <span className={`font-bold ${a.abiertas >= 3 ? "text-danger" : "text-ink"}`}>{a.abiertas}</span>
                          <span className="text-muted"> {es ? "pendientes" : "open"}</span>
                        </span>
                        <span>
                          <span className="font-bold text-ok">{a.cerrados}</span>
                          <span className="text-muted"> {es ? "cierres" : "deals"}</span>
                        </span>
                      </div>
                      {a.abiertas >= 3 && (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-danger">
                          ⚠ {t.agSaturada}
                        </span>
                      )}
                    </div>

                    {/* Col 5: Simulador */}
                    <div className="flex flex-col justify-center gap-1">
                      {a.total_simulaciones === 0 ? (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-danger">
                          🎯 {es ? "Nunca usó" : "Never used"}
                        </span>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-ink">🎯 {a.total_simulaciones} {es ? "sim." : "sim."}</p>
                          {a.puntaje_simulador !== null && (
                            <p className={`text-[11px] font-semibold ${a.puntaje_simulador >= 70 ? "text-ok" : a.puntaje_simulador >= 50 ? "text-warning" : "text-danger"}`}>
                              {a.puntaje_simulador}% avg
                            </p>
                          )}
                          {a.escenario_favorito && (
                            <p className="max-w-[90px] truncate text-[10px] text-faint">{a.escenario_favorito}</p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Col 6: Acciones */}
                    <div className="flex flex-row flex-wrap items-center gap-1.5 sm:flex-col sm:items-end">
                      {a.celular && (
                        <a href={`tel:${a.celular}`}
                          className="rounded-lg bg-ok px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90">
                          📞 {es ? "Llamar" : "Call"}
                        </a>
                      )}
                      <button onClick={() => startEdit(a)}
                        className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-muted hover:bg-soft">
                        ✏️ {t.agEdit}
                      </button>
                      {isOwner && a.email && (
                        <button onClick={() => toggleLider(a)} disabled={busy}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50 ${a.es_lider ? "border-line text-muted hover:bg-soft" : "border-brand text-brand hover:bg-brand-soft"}`}>
                          ★ {a.es_lider ? t.agRemoveLider : t.agMakeLider}
                        </button>
                      )}
                      <button onClick={() => darBaja(a)} disabled={busy}
                        className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-danger hover:bg-red-50 disabled:opacity-50">
                        {t.agBaja}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {filtered.length > 0 && (
            <div className="border-t border-line px-5 py-2 text-[11px] text-muted">
              {filtered.length} {es ? "agentes" : "agents"}{filtered.length !== agentes?.length ? ` ${es ? "de" : "of"} ${agentes?.length}` : ""}
            </div>
          )}
        </Card>
        </div>
      )}

      {/* ── Mapa — al final ──────────────────────────────────────────────── */}
      {agentes && agentes.some((a) => a.lat != null) && (
        <Card className="mt-5 overflow-hidden p-0">
          <div className="border-b border-line px-5 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand">
              🗺️ {es ? `Ubicaciones · ${conMapa} agentes` : `Locations · ${conMapa} agents`}
            </h2>
          </div>
          <div className="h-[340px] w-full">
            <AgentMap agents={agentes} />
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}
