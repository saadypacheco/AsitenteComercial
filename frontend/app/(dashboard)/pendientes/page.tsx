"use client";

// Pendientes / acciones (rebanada F-002) — el "cerrar el día a día". Barra de
// progreso (% completados, sube al cerrar), lista de abiertos con acciones y alta.
import { useEffect, useState } from "react";

import { Badge, ToneDot } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import {
  createPendiente,
  getAgentesOptions,
  getPendientes,
  updatePendienteEstado,
  type AgenteOption,
  type Pendiente,
  type PendientesResp,
} from "@/lib/queries/gestion";
import type { Tone } from "@/lib/queries/executive";

const PRIO_TONE: Record<string, Tone> = { critico: "danger", alto: "warning", medio: "brand", bajo: "neutral" };
const ESTADO_TONE: Record<string, Tone> = { pendiente: "neutral", en_proceso: "warning", cerrado: "ok" };
const TIPOS = ["seguimiento", "reclamo", "consulta", "tarea", "oportunidad"] as const;
const PRIORIDADES = ["critico", "alto", "medio", "bajo"] as const;

export default function PendientesPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.gestion;

  const [data, setData] = useState<PendientesResp | null>(null);
  const [agentes, setAgentes] = useState<AgenteOption[]>([]);
  const [busy, setBusy] = useState(false);

  // Form de alta
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<string>("seguimiento");
  const [prioridad, setPrioridad] = useState<string>("medio");
  const [agenteId, setAgenteId] = useState<string>("");

  function reload() {
    getPendientes(locale).then(setData).catch(() => setData({ progreso: { cerrados: 0, abiertos: 0, total: 0, pct: 0 }, items: [] }));
  }
  useEffect(reload, [locale]);
  useEffect(() => {
    getAgentesOptions().then(setAgentes).catch(() => setAgentes([]));
  }, []);

  async function advance(p: Pendiente, estado: string) {
    setBusy(true);
    await updatePendienteEstado(p.id, estado).catch(() => {});
    reload();
    setBusy(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setBusy(true);
    await createPendiente({ titulo, tipo, prioridad, agente_id: agenteId || null }).catch(() => {});
    setTitulo("");
    setAgenteId("");
    setOpen(false);
    reload();
    setBusy(false);
  }

  const prog = data?.progreso;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">{dict.inicio.nav.pendientes}</h1>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card">
          + {t.newBtn}
        </button>
      </div>

      {/* Barra de progreso */}
      {prog && (
        <Card className="mb-5 p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-brand">{t.progress}</span>
            <span className="text-sm text-muted">
              <span className="text-lg font-bold text-ink">{prog.cerrados}</span> {t.completedOf} {prog.total}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-soft">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-all duration-500" style={{ width: `${prog.pct}%` }} />
          </div>
          <p className="mt-1.5 text-right text-xs font-semibold text-brand">{prog.pct}%</p>
        </Card>
      )}

      {/* Form de alta */}
      {open && (
        <Card className="mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{t.newPending}</h2>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">{t.fTitulo}</label>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">{t.fTipo}</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-lg border border-line px-2 py-2 text-sm focus:border-brand focus:outline-none">
                  {TIPOS.map((x) => <option key={x} value={x}>{t.tipo[x]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">{t.fPrioridad}</label>
                <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full rounded-lg border border-line px-2 py-2 text-sm focus:border-brand focus:outline-none">
                  {PRIORIDADES.map((x) => <option key={x} value={x}>{t.prioridad[x]}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold text-muted">{t.fAgente}</label>
                <select value={agenteId} onChange={(e) => setAgenteId(e.target.value)} className="w-full rounded-lg border border-line px-2 py-2 text-sm focus:border-brand focus:outline-none">
                  <option value="">{t.unassigned}</option>
                  {agentes.map((a) => <option key={a.id} value={a.id}>{a.nombre} {a.apellido ?? ""}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={busy || !titulo.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? t.saving : t.save}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted">
                {t.cancel}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de abiertos */}
      {data && data.items.length === 0 && (
        <Card className="px-4 py-16 text-center text-muted">{t.emptyPending}</Card>
      )}
      <ul className="space-y-2">
        {data?.items.map((p) => (
          <li key={p.id}>
            <Card className="flex items-center gap-3 px-4 py-3">
              <ToneDot tone={PRIO_TONE[p.prioridad]} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.titulo}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Badge tone={PRIO_TONE[p.prioridad]}>{t.prioridad[p.prioridad]}</Badge>
                  <Badge tone={ESTADO_TONE[p.estado]}>{t.estado[p.estado]}</Badge>
                  <span>{t.tipo[p.tipo as keyof typeof t.tipo] ?? p.tipo}</span>
                  {p.agente && <span>· {p.agente}</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {p.estado === "pendiente" && (
                  <button onClick={() => advance(p, "en_proceso")} disabled={busy}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-soft disabled:opacity-50">
                    {t.take}
                  </button>
                )}
                <button onClick={() => advance(p, "cerrado")} disabled={busy}
                  className="rounded-lg bg-ok px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
                  ✓ {t.close}
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
