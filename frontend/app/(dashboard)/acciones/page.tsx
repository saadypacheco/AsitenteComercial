"use client";

// BANDEJA DE ACCIONES IA — "el asistente que ACTÚA". La IA detecta qué hacer y deja
// el mensaje ya redactado; Cecilia toca "Aprobar y enviar" (WhatsApp/email) y se hace
// por ella. Hoy en modo simulado; con el número/email conectado, se envía real.
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { ejecutarAccion, getAcciones, getConfigStatus, type Accion, type ConfigStatus } from "@/lib/queries/executive";

const PRIO_TONE: Record<string, "danger" | "warning" | "ok" | "brand" | "neutral"> = { alta: "danger", media: "warning", baja: "ok" };

export default function AccionesPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.acciones;
  const [acciones, setAcciones] = useState<Accion[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [enviadas, setEnviadas] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cfg, setCfg] = useState<ConfigStatus | null>(null);

  function reload() {
    getAcciones(locale).then((a) => { setAcciones(a); setDrafts(Object.fromEntries(a.map((x) => [x.id, x.mensaje]))); }).catch(() => setAcciones([]));
  }
  useEffect(reload, [locale]);
  useEffect(() => { getConfigStatus().then(setCfg).catch(() => {}); }, []);

  async function enviar(a: Accion) {
    setBusy(a.id);
    await ejecutarAccion({ ref_id: a.ref_id, tipo: a.tipo, destinatario: a.destinatario, canal: a.canal, mensaje: drafts[a.id] ?? a.mensaje }).catch(() => {});
    setAcciones((prev) => (prev ?? []).filter((x) => x.id !== a.id));
    setEnviadas((n) => n + 1);
    setBusy(null);
  }
  async function enviarTodas() {
    const list = acciones ?? [];
    setBusy("all");
    for (const a of list) {
      await ejecutarAccion({ ref_id: a.ref_id, tipo: a.tipo, destinatario: a.destinatario, canal: a.canal, mensaje: drafts[a.id] ?? a.mensaje }).catch(() => {});
    }
    setEnviadas((n) => n + list.length);
    setAcciones([]);
    setBusy(null);
  }

  const prioLabel = useMemo(() => ({ alta: dict.command.prio.alta, media: dict.command.prio.media, baja: dict.command.prio.baja }), [dict]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <div className="mb-1 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">🧠 {t.title}</h1>
        {(acciones?.length ?? 0) > 0 && (
          <button onClick={enviarTodas} disabled={busy === "all"} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card disabled:opacity-50">
            {busy === "all" ? t.sending : `✓ ${t.approveAll}`}
          </button>
        )}
      </div>
      <p className="mb-3 text-sm text-muted">{t.subtitle}</p>
      {cfg && (cfg.whatsapp_enabled || cfg.email_enabled) ? (
        <p className="mb-5 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          ✅ {t.realNote} · {[cfg.whatsapp_enabled && t.waActive, cfg.email_enabled && t.emailActive].filter(Boolean).join(" · ")}
          {enviadas > 0 ? ` · ${enviadas} ${t.sentToday}` : ""}
        </p>
      ) : (
        <p className="mb-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">⚠️ {t.simNote}{enviadas > 0 ? ` · ${enviadas} ${t.sentToday}` : ""}</p>
      )}

      {acciones && acciones.length === 0 && <Card className="px-4 py-16 text-center text-muted">{t.empty}</Card>}

      <ul className="space-y-3">
        {acciones?.map((a) => (
          <li key={a.id}>
            <Card className="overflow-hidden">
              <div className="flex items-start justify-between gap-2 p-4 pb-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    <span>{a.canal === "whatsapp" ? "💬" : "✉️"}</span>{a.titulo}
                  </p>
                  <p className="text-xs text-muted">{t.to}: {a.destinatario} · {a.canal === "whatsapp" ? t.whatsapp : t.email}</p>
                  <p className="mt-0.5 text-xs text-faint">{a.motivo}</p>
                </div>
                <Badge tone={PRIO_TONE[a.prioridad] ?? "neutral"}>{prioLabel[a.prioridad as keyof typeof prioLabel] ?? a.prioridad}</Badge>
              </div>
              {/* Mensaje redactado por la IA (editable) */}
              <div className="px-4">
                <textarea value={drafts[a.id] ?? a.mensaje} onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))} rows={3}
                  className="w-full resize-none rounded-lg border border-line bg-soft px-3 py-2 text-sm text-ink2 focus:border-brand focus:bg-white focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2 p-4 pt-3">
                <button onClick={() => enviar(a)} disabled={busy === a.id} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {busy === a.id ? t.sending : `✓ ${t.approve}`}
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
