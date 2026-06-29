"use client";

import { useEffect, useState } from "react";

import { Badge, ToneDot } from "@/components/executive";
import { Card } from "@/components/ui";
import { getToken, getUser } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import {
  enviarMensajeMasivo,
  getMemoriaAlertas,
  getProgramaCapacitacion,
  type MemoriaAlertas,
} from "@/lib/queries/gestion";
import {
  getCommand,
  search,
  type Command,
  type SearchHit,
  type Tone,
} from "@/lib/queries/executive";

const CHIP_KEYS = ["mensajes", "audios", "imagenes", "personas", "pendientes", "eventos", "grupos", "capacitaciones"] as const;
const PRIO_TONE: Record<string, Tone> = { critico: "danger", alto: "warning", media: "warning", baja: "ok", bajo: "ok" };

// ── Mini calendario ────────────────────────────────────────────────────────────
type Sesion = { id: string; nombre: string; estado: string; fecha: string | null };

function MiniCalendario({ sesiones, es }: { sesiones: Sesion[]; es: boolean }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const byDay = new Map<number, Sesion[]>();
  sesiones.forEach((s) => {
    if (!s.fecha) return;
    const d = new Date(s.fecha);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(s);
    }
  });

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isPast = (d: number) =>
    new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const dayNames = es
    ? ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]
    : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const monthLabel = viewDate.toLocaleDateString(es ? "es" : "en", { month: "long", year: "numeric" });
  const estadoColor = (e: string) =>
    e === "en_curso" ? "bg-ok" : e === "programada" ? "bg-brand" : "bg-faint";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="rounded p-1 text-muted hover:bg-soft">◀</button>
        <p className="text-sm font-semibold capitalize text-ink">{monthLabel}</p>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="rounded p-1 text-muted hover:bg-soft">▶</button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center">
        {dayNames.map((d) => (
          <span key={d} className="text-[10px] font-semibold text-faint">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => (
          <div key={i} className="flex flex-col items-center">
            {day ? (
              <>
                <button
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`h-7 w-7 rounded-full text-xs font-medium transition ${
                    isToday(day) ? "bg-brand font-bold text-white"
                    : selectedDay === day ? "bg-brand-soft font-bold text-brand"
                    : isPast(day) ? "text-faint hover:bg-soft"
                    : "text-ink hover:bg-soft"
                  }`}
                >{day}</button>
                {byDay.has(day) && (
                  <div className={`mt-0.5 h-1 w-1 rounded-full ${estadoColor(byDay.get(day)![0].estado)}`} />
                )}
              </>
            ) : <div className="h-7 w-7" />}
          </div>
        ))}
      </div>
      {selectedDay !== null && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
            {selectedDay} {monthLabel}
          </p>
          {(byDay.get(selectedDay) ?? []).length === 0 ? (
            <p className="text-xs text-faint">{es ? "Sin sesiones" : "No sessions"}</p>
          ) : (
            <ul className="space-y-1.5">
              {(byDay.get(selectedDay) ?? []).map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${estadoColor(s.estado)}`} />
                  <span className="text-ink">{s.nombre}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {(() => {
        const proximas = sesiones
          .filter((s) => s.fecha && new Date(s.fecha) >= today)
          .sort((a, b) => new Date(a.fecha!).getTime() - new Date(b.fecha!).getTime())
          .slice(0, 3);
        if (!proximas.length) return null;
        return (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-faint">
              {es ? "Próximas" : "Upcoming"}
            </p>
            <ul className="space-y-2">
              {proximas.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${estadoColor(s.estado)}`} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-ink">{s.nombre}</p>
                    <p className="text-[10px] text-faint">
                      {new Date(s.fecha!).toLocaleDateString(es ? "es" : "en", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
    </div>
  );
}

// ── Modal de envío masivo ──────────────────────────────────────────────────────
type SendGroup = {
  agente_ids: string[];
  defaultTitulo: string;
  defaultCuerpo: string;
  label: string;
};

function MensajeModal({ group, es, onClose }: { group: SendGroup; es: boolean; onClose: () => void }) {
  const [titulo, setTitulo] = useState(group.defaultTitulo);
  const [cuerpo, setCuerpo] = useState(group.defaultCuerpo);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; enviado_a: number } | null>(null);

  async function send() {
    setSending(true);
    try {
      const r = await enviarMensajeMasivo(group.agente_ids, titulo, cuerpo);
      setResult(r);
    } catch {
      setResult({ ok: false, enviado_a: 0 });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-ink">📨 {es ? "Enviar mensaje" : "Send message"}</h3>
            <p className="mt-0.5 text-xs text-muted">{group.label}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>

        {result ? (
          <div className={`rounded-xl p-4 text-sm font-semibold ${result.ok ? "bg-green-50 text-ok" : "bg-red-50 text-danger"}`}>
            {result.ok
              ? `✅ ${es ? `Enviado a ${result.enviado_a} agentes` : `Sent to ${result.enviado_a} agents`}`
              : (es ? "Error al enviar" : "Send error")}
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-faint">{es ? "Título" : "Title"}</label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full rounded-lg border border-line bg-soft px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold text-faint">{es ? "Mensaje" : "Message"}</label>
              <textarea
                value={cuerpo}
                onChange={(e) => setCuerpo(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-line bg-soft px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={send}
                disabled={sending || !titulo.trim() || !cuerpo.trim()}
                className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {sending ? "…" : (es ? `Enviar a ${group.agente_ids.length} agentes` : `Send to ${group.agente_ids.length} agents`)}
              </button>
              <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-soft">
                {es ? "Cancelar" : "Cancel"}
              </button>
            </div>
          </>
        )}

        {result?.ok && (
          <button onClick={onClose} className="mt-3 w-full rounded-lg border border-line py-2 text-sm text-muted hover:bg-soft">
            {es ? "Cerrar" : "Close"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Panel alertas + IA (fusionado) ─────────────────────────────────────────────
function AlertasPanel({
  alertas, comando, es, onSend,
}: {
  alertas: MemoriaAlertas | null;
  comando: Command | null;
  es: boolean;
  onSend: (g: SendGroup) => void;
}) {
  const totalAlertas =
    (alertas?.pendientes_vencidos.length ?? 0) +
    (alertas?.sin_actividad.length ?? 0) +
    (alertas?.sin_simulacion.length ?? 0) +
    (alertas?.notificaciones_olvidadas ?? 0) +
    (comando?.recomendaciones.length ?? 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-danger">
          ⚠️ {es ? "No se te escape nada" : "Don't miss anything"}
        </h2>
        {totalAlertas > 0 && (
          <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">{totalAlertas}</span>
        )}
      </div>

      {!alertas && !comando && <p className="text-sm text-muted">…</p>}

      {alertas && totalAlertas === 0 && (
        <div className="rounded-xl border border-ok/30 bg-green-50 px-4 py-3 text-sm text-ok">
          🎉 {es ? "Todo al día — sin alertas ni recomendaciones" : "All caught up — no alerts or recommendations"}
        </div>
      )}

      {/* Recomendaciones IA */}
      {(comando?.recomendaciones.length ?? 0) > 0 && (
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-brand">
            🧠 {es ? "Recomendaciones IA" : "AI Recommendations"}
          </p>
          <ul className="space-y-2">
            {comando!.recomendaciones.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <ToneDot tone={r.tono} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-semibold text-ink">{r.accion}</p>
                    <Badge tone={PRIO_TONE[r.prioridad] ?? "neutral"}>{r.prioridad}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">{r.motivo}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pendientes vencidos */}
      {(alertas?.pendientes_vencidos.length ?? 0) > 0 && (
        <div className="rounded-xl border border-danger/20 bg-red-50/60 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-danger">
            🚨 {es ? "Pendientes vencidos" : "Overdue tasks"} ({alertas!.pendientes_vencidos.length})
          </p>
          <ul className="space-y-1.5">
            {alertas!.pendientes_vencidos.map((p) => (
              <li key={p.id} className="flex items-start gap-2 text-xs">
                <Badge tone={PRIO_TONE[p.prioridad] ?? "neutral"}>{p.prioridad}</Badge>
                <div className="min-w-0">
                  <p className="font-medium text-ink">{p.titulo}</p>
                  {p.agente && <p className="text-faint">{p.agente}</p>}
                  <p className="text-danger">
                    {es ? "Venció" : "Due"}: {new Date(p.fecha_cierre).toLocaleDateString(es ? "es" : "en", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sin actividad */}
      {(alertas?.sin_actividad.length ?? 0) > 0 && (
        <div className="rounded-xl border border-warning/20 bg-amber-50/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-warning">
              👻 {es ? "Sin asistir a ninguna sesión" : "No sessions attended"} ({alertas!.sin_actividad.length})
            </p>
            <button
              onClick={() => onSend({
                agente_ids: alertas!.sin_actividad.map((a) => a.id),
                label: es
                  ? `${alertas!.sin_actividad.length} agentes sin asistencia`
                  : `${alertas!.sin_actividad.length} agents without attendance`,
                defaultTitulo: es ? "¡Te esperamos en la próxima sesión!" : "We're waiting for you at the next session!",
                defaultCuerpo: es
                  ? "Hola! Notamos que todavía no asististe a ninguna sesión de capacitación. ¡Te esperamos en la próxima! Si tenés alguna duda, escribinos."
                  : "Hi! We noticed you haven't attended any training session yet. Join us for the next one! Feel free to reach out if you have questions.",
              })}
              className="shrink-0 rounded-lg bg-brand px-2.5 py-1 text-[10px] font-bold text-white hover:opacity-90"
            >
              📨 {es ? "Mensaje" : "Message"}
            </button>
          </div>
          <ul className="space-y-1">
            {alertas!.sin_actividad.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-xs">
                <span className="font-medium text-ink">{a.nombre} {a.apellido ?? ""}</span>
                {a.celular && (
                  <a
                    href={`tel:${a.celular}`}
                    className="ml-auto shrink-0 rounded border border-warning px-2 py-0.5 text-[10px] font-medium text-warning hover:bg-amber-50"
                  >
                    📞 {es ? "Llamar" : "Call"}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sin simulación */}
      {(alertas?.sin_simulacion.length ?? 0) > 0 && (
        <div className="rounded-xl border border-warning/20 bg-amber-50/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-warning">
              🎯 {es ? "Nunca usaron el entrenamiento" : "Never used training"} ({alertas!.sin_simulacion.length})
            </p>
            <button
              onClick={() => onSend({
                agente_ids: alertas!.sin_simulacion.map((a) => a.id),
                label: es
                  ? `${alertas!.sin_simulacion.length} agentes sin práctica`
                  : `${alertas!.sin_simulacion.length} agents without training`,
                defaultTitulo: es ? "¡Probá el simulador de ventas!" : "Try the sales simulator!",
                defaultCuerpo: es
                  ? "Hola! Todavía no usaste el simulador de entrenamiento. Es una forma genial de practicar y mejorar tus habilidades de venta. ¡Entrá y probalo, solo te lleva unos minutos!"
                  : "Hi! You haven't tried the training simulator yet. It's a great way to practice and improve your sales skills. Give it a try — it only takes a few minutes!",
              })}
              className="shrink-0 rounded-lg bg-brand px-2.5 py-1 text-[10px] font-bold text-white hover:opacity-90"
            >
              📨 {es ? "Mensaje" : "Message"}
            </button>
          </div>
          <p className="text-xs text-ink">
            {alertas!.sin_simulacion.map((a) => `${a.nombre} ${a.apellido ?? ""}`.trim()).join(", ")}
          </p>
        </div>
      )}

      {/* Notificaciones olvidadas */}
      {(alertas?.notificaciones_olvidadas ?? 0) > 0 && (
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-3">
          <p className="text-xs font-medium text-brand">
            🔔 {alertas!.notificaciones_olvidadas} {es
              ? "notificaciones sin leer con más de 48hs"
              : "unread notifications older than 48h"}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function MemoriaPage() {
  const { locale, t: dict } = useLocale();
  const es = locale === "es";

  const [, setUser] = useState("Cecilia");
  const [comando, setComando] = useState<Command | null>(null);
  const [alertas, setAlertas] = useState<MemoriaAlertas | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);

  const [chip, setChip] = useState<string>("mensajes");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  const [sendGroup, setSendGroup] = useState<SendGroup | null>(null);

  useEffect(() => {
    if (!getToken()) { window.location.href = "/login"; return; }
    setUser(getUser()?.nombre ?? "Cecilia");
    getCommand(locale).then(setComando).catch(() => {});
    getMemoriaAlertas().then(setAlertas).catch(() => {});
    getProgramaCapacitacion(locale)
      .then((p) => setSesiones(p.calendario ?? []))
      .catch(() => {});
  }, [locale]);

  async function runSearch() {
    if (!q.trim()) return;
    setHits(await search(q, chip).catch(() => []));
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">🧠 {es ? "Memoria" : "Memory"}</h1>
        <p className="mt-0.5 text-sm text-muted">
          {es
            ? "Todo lo que el sistema sabe — buscá, preguntá, no olvidés nada"
            : "Everything the system knows — search, ask, forget nothing"}
        </p>
      </header>

      {/* 1. Buscador global — primero */}
      <Card className="mb-5 p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">
          🔍 {es ? "Buscar en todo" : "Search everything"}
        </h2>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder={es
              ? "Buscar mensajes, personas, grupos, eventos, pendientes…"
              : "Search messages, people, groups, events, pending items…"}
            className="w-full rounded-lg bg-soft px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <button
            onClick={runSearch}
            className="shrink-0 rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:opacity-90"
          >
            {dict.inicio.searchBtn}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHIP_KEYS.map((x) => (
            <button
              key={x}
              onClick={() => setChip(x)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                chip === x ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-soft"
              }`}
            >
              {dict.inicio.chips[x as keyof typeof dict.inicio.chips]}
            </button>
          ))}
        </div>
        {hits !== null && (
          <div className="mt-3 border-t border-line pt-3">
            {hits.length === 0 ? (
              <p className="text-sm text-muted">
                {dict.inicio.searchEmptyPre} &ldquo;{q}&rdquo;. {dict.inicio.searchEmptyPost}
              </p>
            ) : (
              <ul className="space-y-2">
                {hits.slice(0, 6).map((h) => (
                  <li key={h.message_id} className="rounded-lg bg-soft px-3 py-2 text-sm">
                    <span className="text-ink">{h.texto}</span>
                    <span className="mt-0.5 block text-xs text-muted">{h.remitente} · {h.chat}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {/* 2. Calendario + Alertas+IA */}
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">
            📅 {es ? "Calendario" : "Calendar"}
          </h2>
          <MiniCalendario sesiones={sesiones} es={es} />
        </Card>

        <Card className="p-4">
          <AlertasPanel alertas={alertas} comando={comando} es={es} onSend={setSendGroup} />
        </Card>
      </div>

      {/* Modal envío masivo */}
      {sendGroup && (
        <MensajeModal group={sendGroup} es={es} onClose={() => setSendGroup(null)} />
      )}
    </div>
  );
}
