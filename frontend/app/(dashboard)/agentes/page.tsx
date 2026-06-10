"use client";

// Agentes (rebanada F-002): mapa con sus ubicaciones + lista con datos de contacto
// + alta/edición/baja. El celular es su identidad de WhatsApp (puente con la captura).
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

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

// Leaflet necesita window → carga client-only.
const AgentMap = dynamic(() => import("@/components/agent-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">…</div>,
});

const EMPTY: AgenteInput = { nombre: "", apellido: "", celular: "", email: "", ciudad: "", region: "", superior_id: "", estado: "activo", lat: null, lng: null };

export default function AgentesPage() {
  const { t: dict } = useLocale();
  const t = dict.gestion;

  const [agentes, setAgentes] = useState<Agente[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AgenteInput>(EMPTY);
  const [view, setView] = useState<"lista" | "jerarquia">("lista");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => setIsOwner(getUser()?.alcance === "todo"), []);

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

  function reload() {
    getAgentes().then(setAgentes).catch(() => setAgentes([]));
  }
  useEffect(reload, []);

  function startNew() {
    setEditId(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function startEdit(a: Agente) {
    setEditId(a.id);
    setForm({
      nombre: a.nombre, apellido: a.apellido ?? "", celular: a.celular ?? "", email: a.email ?? "",
      ciudad: a.ciudad ?? "", region: a.region ?? "", superior_id: a.superior_id ?? "",
      estado: a.estado, lat: a.lat, lng: a.lng,
    });
    setOpen(true);
  }
  function set<K extends keyof AgenteInput>(k: K, v: AgenteInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
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

  const conMapa = agentes?.filter((a) => a.lat != null && a.lng != null).length ?? 0;
  const inputCls = "w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">{dict.inicio.nav.agentes}</h1>
        <button onClick={startNew} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card">
          + {t.newBtn}
        </button>
      </div>

      {/* Stats ejecutivos */}
      {agentes && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-t-[3px] border-t-brand p-4"><p className="text-2xl font-bold text-brand">{agentes.length}</p><p className="text-[11px] text-muted">{t.agCount}</p></Card>
          <Card className="border-t-[3px] border-t-ok p-4"><p className="text-2xl font-bold text-ok">{agentes.filter((a) => a.estado === "activo").length}</p><p className="text-[11px] text-muted">{t.agActivos}</p></Card>
          <Card className="border-t-[3px] border-t-danger p-4"><p className="text-2xl font-bold text-danger">{agentes.filter((a) => a.abiertas >= 3).length}</p><p className="text-[11px] text-muted">{t.agSaturados}</p></Card>
          <Card className="border-t-[3px] border-t-line p-4"><p className="text-2xl font-bold text-ink">{conMapa}</p><p className="text-[11px] text-muted">{t.onMap}</p></Card>
        </div>
      )}

      {/* Mapa */}
      <Card className="mb-5 overflow-hidden p-0">
        <div className="h-[340px] w-full">{agentes && <AgentMap agents={agentes} />}</div>
      </Card>

      {/* Form alta/edición */}
      {open && (
        <Card className="mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{editId ? t.agEdit : t.agNew}</h2>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <Field label={t.fNombre}><input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} autoFocus className={inputCls} /></Field>
            <Field label={t.fApellido}><input value={form.apellido ?? ""} onChange={(e) => set("apellido", e.target.value)} className={inputCls} /></Field>
            <Field label={t.fCelular}><input value={form.celular ?? ""} onChange={(e) => set("celular", e.target.value)} className={inputCls} /></Field>
            <Field label={t.fEmail}><input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className={inputCls} /></Field>
            <Field label={t.fCiudad}><input value={form.ciudad ?? ""} onChange={(e) => set("ciudad", e.target.value)} className={inputCls} /></Field>
            <Field label={t.fRegion}><input value={form.region ?? ""} onChange={(e) => set("region", e.target.value)} className={inputCls} /></Field>
            <Field label={t.fSuperior}>
              <select value={form.superior_id ?? ""} onChange={(e) => set("superior_id", e.target.value)} className={inputCls}>
                <option value="">{t.noSuperior}</option>
                {agentes?.filter((a) => a.id !== editId).map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre} {a.apellido ?? ""}</option>
                ))}
              </select>
            </Field>
            <Field label={t.fEstado}>
              <select value={form.estado ?? "activo"} onChange={(e) => set("estado", e.target.value)} className={inputCls}>
                <option value="activo">{t.estadoAgente.activo}</option>
                <option value="inactivo">{t.estadoAgente.inactivo}</option>
              </select>
            </Field>
            <Field label={t.fLat}><input type="number" step="any" value={form.lat ?? ""} onChange={(e) => set("lat", e.target.value === "" ? null : Number(e.target.value))} className={inputCls} /></Field>
            <Field label={t.fLng}><input type="number" step="any" value={form.lng ?? ""} onChange={(e) => set("lng", e.target.value === "" ? null : Number(e.target.value))} className={inputCls} /></Field>
            <div className="col-span-2 flex gap-2 pt-1">
              <button type="submit" disabled={busy || !form.nombre.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? t.saving : t.save}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted">{t.cancel}</button>
            </div>
          </form>
        </Card>
      )}

      {/* Vista: Lista / Jerarquía */}
      <div className="mb-4 flex gap-2">
        {(["lista", "jerarquia"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${view === v ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-soft"}`}>
            {v === "lista" ? t.agViewList : t.agViewTree}
          </button>
        ))}
      </div>

      {agentes && agentes.length === 0 && <Card className="px-4 py-16 text-center text-muted">{t.agEmpty}</Card>}

      {view === "jerarquia" && agentes && (
        <Card className="p-4">
          <AgentTree agentes={agentes} labels={{ activo: t.estadoAgente.activo, inactivo: t.estadoAgente.inactivo, saturada: t.agSaturada }} />
        </Card>
      )}

      {view === "lista" && (
      <div className="grid gap-3 sm:grid-cols-2">
        {agentes?.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={`${a.nombre} ${a.apellido ?? ""}`} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{a.nombre} {a.apellido ?? ""}</p>
                  <p className="text-xs text-muted">{a.ciudad}{a.region ? `, ${a.region}` : ""}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {a.es_lider && <Badge tone="brand">★ {t.agLiderBadge}</Badge>}
                <Badge tone={a.estado === "activo" ? "ok" : "warning"}>
                  {a.estado === "activo" ? t.estadoAgente.activo : t.estadoAgente.inactivo}
                </Badge>
                {a.abiertas >= 3 && <Badge tone="danger">{t.agSaturada}</Badge>}
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-ink2">
              {a.celular && <p>📱 {a.celular}</p>}
              {a.email && <p className="truncate">✉️ {a.email}</p>}
              <p className="flex items-center gap-3 pt-1 text-xs text-muted">
                <span><span className={`font-bold ${a.abiertas >= 3 ? "text-danger" : "text-ink"}`}>{a.abiertas}</span> {t.agOpenItems}</span>
                <span>· <span className="font-bold text-ok">{a.cerrados}</span> {dict.command.deals}</span>
              </p>
              {a.superior && <p className="text-xs text-muted">↳ {t.fSuperior}: {a.superior}</p>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
              <button onClick={() => startEdit(a)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-soft">{t.agEdit}</button>
              {isOwner && a.email && (
                <button onClick={() => toggleLider(a)} disabled={busy}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${a.es_lider ? "border-line text-muted hover:bg-soft" : "border-brand text-brand hover:bg-brand-soft"}`}>
                  ★ {a.es_lider ? t.agRemoveLider : t.agMakeLider}
                </button>
              )}
              <button onClick={() => darBaja(a)} disabled={busy} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-danger hover:bg-red-50 disabled:opacity-50">{t.agBaja}</button>
            </div>
          </Card>
        ))}
      </div>
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
