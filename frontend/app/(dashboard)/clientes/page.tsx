"use client";

// CARTERA DE CLIENTES (Feature D): renovaciones próximas, clientes sin seguimiento
// y cross-sell (vida → retiro). Stats + filtros + tarjetas con acciones + alta.
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { getAgentesOptions, type AgenteOption } from "@/lib/queries/gestion";
import {
  createCliente, getClientes, registrarContacto, updateCliente,
  type Cliente, type ClienteInput, type ClientesResp,
} from "@/lib/queries/clientes";
import type { Tone } from "@/lib/queries/executive";

const PROD_TONE: Record<string, Tone> = { vida: "ok", retiro: "brand", auto: "warning", salud: "neutral", hogar: "neutral" };
const PRODUCTOS = ["vida", "retiro", "auto", "salud", "hogar"] as const;
const FILTERS = ["all", "renovar", "seguimiento", "xsell", "vip"] as const;
const EMPTY: ClienteInput = { nombre: "", telefono: "", email: "", agente_id: "", producto: "vida", estado: "activo", valor_poliza: 0, vencimiento: "", vip: false };

export default function ClientesPage() {
  const { t: dict } = useLocale();
  const t = dict.clientes;
  const [data, setData] = useState<ClientesResp | null>(null);
  const [agentes, setAgentes] = useState<AgenteOption[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteInput>(EMPTY);

  function reload() {
    getClientes().then(setData).catch(() => setData(null));
  }
  useEffect(reload, []);
  useEffect(() => { getAgentesOptions().then(setAgentes).catch(() => setAgentes([])); }, []);

  function set<K extends keyof ClienteInput>(k: K, v: ClienteInput[K]) { setForm((f) => ({ ...f, [k]: v })); }
  function startNew() { setEditId(null); setForm(EMPTY); setOpen(true); }
  function startEdit(c: Cliente) {
    setEditId(c.id);
    setForm({ nombre: c.nombre, telefono: c.telefono ?? "", email: c.email ?? "", agente_id: c.agente_id ?? "", producto: c.producto ?? "vida", estado: c.estado, valor_poliza: c.valor, vencimiento: c.vencimiento ?? "", vip: c.vip });
    setOpen(true);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setBusy(true);
    const body = { ...form, agente_id: form.agente_id || null, vencimiento: form.vencimiento || null };
    if (editId) await updateCliente(editId, body).catch(() => {});
    else await createCliente(body).catch(() => {});
    setOpen(false); reload(); setBusy(false);
  }
  async function contacto(c: Cliente) {
    setBusy(true);
    await registrarContacto(c.id).catch(() => {});
    reload(); setBusy(false);
  }

  const items = useMemo(() => {
    const list = data?.items ?? [];
    if (filter === "renovar") return list.filter((c) => c.renovacion_dias != null && c.renovacion_dias <= 30);
    if (filter === "seguimiento") return list.filter((c) => c.sin_contacto_dias == null || c.sin_contacto_dias > 30);
    if (filter === "xsell") return list.filter((c) => c.cross_sell);
    if (filter === "vip") return list.filter((c) => c.vip);
    return list;
  }, [data, filter]);

  const s = data?.summary;
  const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US");
  const inputCls = "w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{dict.inicio.nav.clientes}</h1>
          <p className="mt-0.5 text-sm text-muted">{t.subtitle}</p>
        </div>
        <button onClick={startNew} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card">+ {t.newBtn}</button>
      </div>

      {/* Stats */}
      {s && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-t-[3px] border-t-brand p-4"><p className="text-2xl font-bold text-brand">{s.total}</p><p className="text-[11px] text-muted">{t.total}</p></Card>
          <Card className="border-t-[3px] border-t-warning p-4"><p className="text-2xl font-bold text-warning">{s.por_renovar}</p><p className="text-[11px] text-muted">{t.porRenovar}</p></Card>
          <Card className="border-t-[3px] border-t-danger p-4"><p className="text-2xl font-bold text-danger">{s.sin_seguimiento}</p><p className="text-[11px] text-muted">{t.sinSeguimiento}</p></Card>
          <Card className="border-t-[3px] border-t-ok p-4"><p className="text-2xl font-bold text-ok">{money(s.valor_cartera)}</p><p className="text-[11px] text-muted">{t.cartera}</p></Card>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === f ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-soft"}`}>
            {f === "all" ? t.filterAll : f === "renovar" ? t.filterRenovar : f === "seguimiento" ? t.filterSeguimiento : f === "xsell" ? t.filterXsell : t.filterVip}
          </button>
        ))}
      </div>

      {/* Form */}
      {open && (
        <Card className="mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{editId ? t.editarCliente : t.nuevoCliente}</h2>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <Field label={t.fNombre}><input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} autoFocus className={inputCls} /></Field>
            <Field label={t.fTelefono}><input value={form.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} className={inputCls} /></Field>
            <Field label={t.fEmail}><input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className={inputCls} /></Field>
            <Field label={t.fProducto}>
              <select value={form.producto ?? "vida"} onChange={(e) => set("producto", e.target.value)} className={inputCls}>
                {PRODUCTOS.map((p) => <option key={p} value={p}>{t.producto[p]}</option>)}
              </select>
            </Field>
            <Field label={t.fValor}><input type="number" value={form.valor_poliza ?? 0} onChange={(e) => set("valor_poliza", Number(e.target.value))} className={inputCls} /></Field>
            <Field label={t.fVencimiento}><input type="date" value={form.vencimiento ?? ""} onChange={(e) => set("vencimiento", e.target.value)} className={inputCls} /></Field>
            <Field label={t.fAgente}>
              <select value={form.agente_id ?? ""} onChange={(e) => set("agente_id", e.target.value)} className={inputCls}>
                <option value="">—</option>
                {agentes.map((a) => <option key={a.id} value={a.id}>{a.nombre} {a.apellido ?? ""}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 pt-6 text-sm text-muted">
              <input type="checkbox" checked={form.vip ?? false} onChange={(e) => set("vip", e.target.checked)} className="h-4 w-4 accent-brand" /> {t.fVip}
            </label>
            <div className="col-span-2 flex gap-2 pt-1">
              <button type="submit" disabled={busy || !form.nombre.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{t.save}</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted">{t.cancel}</button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista */}
      {data && items.length === 0 && <Card className="px-4 py-16 text-center text-muted">{t.empty}</Card>}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold text-ink">
                  {c.nombre}
                  {c.vip && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">★ VIP</span>}
                </p>
                <p className="text-xs text-muted">{c.agente ?? "—"}</p>
              </div>
              {c.producto && <Badge tone={PROD_TONE[c.producto] ?? "neutral"}>{t.producto[c.producto as keyof typeof t.producto] ?? c.producto}</Badge>}
            </div>

            <div className="mt-2 space-y-1 text-xs">
              {c.renovacion_dias != null && (
                <p className={c.renovacion_dias < 0 ? "font-semibold text-danger" : c.renovacion_dias <= 30 ? "font-semibold text-warning" : "text-muted"}>
                  📅 {c.renovacion_dias < 0 ? t.vencido : `${t.renovaEn} ${c.renovacion_dias} ${t.dias}`} · {money(c.valor)}
                </p>
              )}
              <p className={c.sin_contacto_dias == null || c.sin_contacto_dias > 30 ? "text-danger" : "text-muted"}>
                {c.sin_contacto_dias == null ? `📵 ${t.nunca}` : `📞 ${t.sinContacto} ${c.sin_contacto_dias} ${t.dias}`}
              </p>
              {c.cross_sell && <p className="font-semibold text-brand">✨ {t.xsellHint}</p>}
            </div>

            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <button onClick={() => contacto(c)} disabled={busy} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">📞 {t.contactar}</button>
              <button onClick={() => startEdit(c)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-soft">{t.editar}</button>
            </div>
          </Card>
        ))}
      </div>
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
