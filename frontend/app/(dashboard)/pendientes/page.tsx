"use client";

// PENDIENTES — herramienta de gestión para líderes. Header ejecutivo, filtros
// rápidos, tarjetas enriquecidas (cliente/VIP/antigüedad/responsable/acciones) y
// panel lateral de IA Insights. Datos reales (rebanada F-002) + derivados.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Avatar, Badge, ToneDot } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { getCommand, type Command, type Tone } from "@/lib/queries/executive";
import {
  createPendiente,
  escalarPendiente,
  getAgentesOptions,
  getPendientes,
  reasignarPendiente,
  updatePendienteEstado,
  type AgenteOption,
  type Pendiente,
  type PendientesResp,
} from "@/lib/queries/gestion";

const PRIO_TONE: Record<string, Tone> = { critico: "danger", alto: "warning", medio: "brand", bajo: "neutral" };
const TIPOS = ["seguimiento", "reclamo", "consulta", "tarea", "oportunidad"] as const;
const PRIORIDADES = ["critico", "alto", "medio", "bajo"] as const;
const FILTERS = ["all", "critico", "sin_asignar", "seguimiento", "reclamo", "tarea", "oportunidad"] as const;

export default function PendientesPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.gestion;

  const [data, setData] = useState<PendientesResp | null>(null);
  const [agentes, setAgentes] = useState<AgenteOption[]>([]);
  const [cmd, setCmd] = useState<Command | null>(null);
  const [busy, setBusy] = useState(false);

  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  // Alta
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<string>("seguimiento");
  const [prioridad, setPrioridad] = useState<string>("medio");
  const [agenteId, setAgenteId] = useState<string>("");

  function reload() {
    getPendientes(locale).then(setData).catch(() => setData(null));
  }
  useEffect(reload, [locale]);
  useEffect(() => {
    getCommand(locale).then(setCmd).catch(() => setCmd(null));
  }, [locale]);
  useEffect(() => {
    getAgentesOptions().then(setAgentes).catch(() => setAgentes([]));
  }, []);

  async function act(fn: Promise<void>) {
    setBusy(true);
    await fn.catch(() => {});
    reload();
    setBusy(false);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setBusy(true);
    await createPendiente({ titulo, tipo, prioridad, agente_id: agenteId || null }).catch(() => {});
    setTitulo(""); setAgenteId(""); setOpen(false);
    reload();
    setBusy(false);
  }

  const hace = (h: number) => (locale === "es" ? `hace ${h}h` : `${h}h ago`);

  const items = useMemo(() => {
    let list = data?.items ?? [];
    if (filter === "critico") list = list.filter((p) => p.prioridad === "critico");
    else if (filter === "sin_asignar") list = list.filter((p) => !p.agente_id);
    else if (filter !== "all") list = list.filter((p) => p.tipo === filter);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) =>
        [p.titulo, p.cliente, p.agente].some((x) => (x ?? "").toLowerCase().includes(s)));
    }
    return list;
  }, [data, filter, q]);

  const prog = data?.progreso;
  const filterLabel = (f: string) =>
    f === "all" ? t.fAll : f === "critico" ? t.prioridad.critico : f === "sin_asignar" ? t.fUnassigned : t.tipo[f as keyof typeof t.tipo];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      {/* Header ejecutivo */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{dict.inicio.nav.pendientes}</h1>
          {prog && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-ink">{prog.abiertos} <span className="font-normal text-muted">{t.pendOpen}</span></span>
              <span className="text-danger">●</span>
              <span className="font-semibold text-danger">{prog.criticos} <span className="font-normal text-muted">{t.pendCrit}</span></span>
              <span className="text-warning">●</span>
              <span className="font-semibold text-warning">{prog.sin_asignar} <span className="font-normal text-muted">{t.pendUnassigned}</span></span>
            </p>
          )}
        </div>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card">
          + {t.pendNewBtn}
        </button>
      </div>

      {/* Buscador */}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.pendSearch}
        className="mb-3 w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink shadow-card placeholder:text-faint focus:border-brand focus:outline-none" />

      {/* Filtros rápidos */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === f ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-soft"}`}>
            {filterLabel(f)}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Columna principal */}
        <div>
          {/* Progreso */}
          {prog && (
            <Card className="mb-4 p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand">{t.progress}</span>
                <span className="text-sm text-muted"><span className="font-bold text-ink">{prog.cerrados}</span> {t.completedOf} {prog.total} · {prog.pct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-soft">
                <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-all duration-500" style={{ width: `${prog.pct}%` }} />
              </div>
            </Card>
          )}

          {/* Alta */}
          {open && (
            <Card className="mb-4 p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{t.newPending}</h2>
              <form onSubmit={submit} className="space-y-3">
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus placeholder={t.fTitulo}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none" />
                <div className="grid grid-cols-3 gap-3">
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-line px-2 py-2 text-sm">
                    {TIPOS.map((x) => <option key={x} value={x}>{t.tipo[x]}</option>)}
                  </select>
                  <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="rounded-lg border border-line px-2 py-2 text-sm">
                    {PRIORIDADES.map((x) => <option key={x} value={x}>{t.prioridad[x]}</option>)}
                  </select>
                  <select value={agenteId} onChange={(e) => setAgenteId(e.target.value)} className="rounded-lg border border-line px-2 py-2 text-sm">
                    <option value="">{t.unassigned}</option>
                    {agentes.map((a) => <option key={a.id} value={a.id}>{a.nombre} {a.apellido ?? ""}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={busy || !titulo.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? t.saving : t.save}</button>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted">{t.cancel}</button>
                </div>
              </form>
            </Card>
          )}

          {/* Tarjetas */}
          {data && items.length === 0 && <Card className="px-4 py-16 text-center text-muted">{t.emptyPending}</Card>}
          <ul className="space-y-3">
            {items.map((p) => (
              <li key={p.id}>
                <PendienteCard p={p} t={t} agentes={agentes} busy={busy} hace={hace}
                  onClose={() => act(updatePendienteEstado(p.id, "cerrado"))}
                  onTake={() => act(updatePendienteEstado(p.id, "en_proceso"))}
                  onEscalate={() => act(escalarPendiente(p.id))}
                  onReassign={(aid) => act(reasignarPendiente(p.id, aid))} />
              </li>
            ))}
          </ul>
        </div>

        {/* Panel IA Insights */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5">
              <h2 className="text-sm font-bold text-white">🧠 {t.iaInsights}</h2>
            </div>
            <div className="divide-y divide-line">
              <InsightBlock title={t.iaRiesgo} tone="warning" count={cmd?.kpis.riesgo.value}
                rows={cmd?.alertas.filter((a) => a.vip).map((a) => a.cliente) ?? []} />
              <InsightBlock title={t.iaSaturados} tone="danger" count={cmd?.equipo.filter((e) => e.estado === "saturada").length}
                rows={cmd?.equipo.filter((e) => e.estado === "saturada").map((e) => `${e.nombre} · ${e.abiertas}`) ?? []} />
              <InsightBlock title={t.iaOpps} tone="ok" count={cmd?.oportunidades.length}
                rows={cmd?.oportunidades.slice(0, 3).map((o) => o.titulo) ?? []} />
              <InsightBlock title={t.iaFirst} tone="brand"
                rows={cmd?.alertas.slice(0, 3).map((a) => a.cliente) ?? []} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function PendienteCard({
  p, t, agentes, busy, hace, onClose, onTake, onEscalate, onReassign,
}: {
  p: Pendiente;
  t: ReturnType<typeof useLocale>["t"]["gestion"];
  agentes: AgenteOption[];
  busy: boolean;
  hace: (h: number) => string;
  onClose: () => void;
  onTake: () => void;
  onEscalate: () => void;
  onReassign: (aid: string) => void;
}) {
  const urgente = p.prioridad === "critico";
  return (
    <Card className={`border-l-4 p-4 ${urgente ? "border-l-danger" : p.prioridad === "alto" ? "border-l-warning" : "border-l-line"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-ink">
            {urgente && "🚨"} {p.cliente ?? p.titulo}
            {p.vip && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">★ VIP</span>}
          </p>
          {p.cliente && <p className="text-sm text-muted">{p.titulo}</p>}
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <Badge tone={PRIO_TONE[p.prioridad]}>{t.prioridad[p.prioridad]}</Badge>
            <Badge tone="neutral">{t.tipo[p.tipo as keyof typeof t.tipo] ?? p.tipo}</Badge>
            <span className="text-faint">⏱ {hace(p.horas)}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {/* Responsable / reasignar */}
        <span className="flex items-center gap-1.5">
          {p.agente ? <Avatar name={p.agente} /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-soft text-xs text-faint">?</span>}
          <select value={p.agente_id ?? ""} onChange={(e) => onReassign(e.target.value)} disabled={busy}
            className="max-w-[140px] rounded-lg border border-line bg-white px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none">
            <option value="">{t.unassigned}</option>
            {agentes.map((a) => <option key={a.id} value={a.id}>{a.nombre} {a.apellido ?? ""}</option>)}
          </select>
        </span>
        <span className="flex-1" />
        <Link href="/hoy" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-soft">{t.verConv}</Link>
        {!urgente && (
          <button onClick={onEscalate} disabled={busy} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-warning hover:bg-orange-50 disabled:opacity-50">↑ {t.escalar}</button>
        )}
        {p.estado === "pendiente" && (
          <button onClick={onTake} disabled={busy} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-soft disabled:opacity-50">{t.take}</button>
        )}
        <button onClick={onClose} disabled={busy} className="rounded-lg bg-ok px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">✓ {t.close}</button>
      </div>
    </Card>
  );
}

function InsightBlock({ title, tone, count, rows }: { title: string; tone: Tone; count?: number; rows: (string | null)[] }) {
  return (
    <div className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <ToneDot tone={tone} />
        <span className="text-xs font-bold uppercase tracking-wide text-ink2">{title}</span>
        {count != null && <span className="ml-auto rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold text-muted">{count}</span>}
      </div>
      <ul className="space-y-1 pl-4 text-xs text-muted">
        {rows.filter(Boolean).slice(0, 3).map((r, i) => <li key={i} className="truncate">· {r}</li>)}
        {rows.filter(Boolean).length === 0 && <li className="text-faint">—</li>}
      </ul>
    </div>
  );
}
