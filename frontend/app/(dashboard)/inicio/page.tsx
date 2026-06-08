"use client";

// DASHBOARD EJECUTIVO "¡Hola Cecilia!" (Producto ②). Responsive: sidebar + grilla
// en escritorio, una columna en móvil (Principio VI). Todos los bloques leen datos
// REALES del backend (rebanada de gestión F-002). Los bloques de IA usan LiteLLM
// con fallback determinista. Diseño portado del mockup ejecutivo.
import { useEffect, useState } from "react";

import { Avatar, Badge, Donut, Gauge, Sparkline, ToneDot } from "@/components/executive";
import { Card } from "@/components/ui";
import {
  askAi,
  getAiSummary,
  getExecutive,
  search,
  type AiBullet,
  type Executive,
  type SearchHit,
  type Tone,
} from "@/lib/queries/executive";

const NAV = [
  ["Inicio", true],
  ["Mensajes", false],
  ["Grupos", false],
  ["Eventos", false],
  ["Pendientes", false],
  ["Oportunidades", false],
  ["Agentes", false],
  ["Capacitaciones", false],
  ["Reportes", false],
  ["IA Insights", false],
  ["Ajustes", false],
] as const;

const CHIPS = ["mensajes", "audios", "imagenes", "personas", "pendientes", "eventos", "grupos", "capacitaciones"];
const PREGUNTAS = [
  "Resumime la semana",
  "¿Qué clientes requieren seguimiento?",
  "¿Quién habló de capacitación?",
  "¿Qué grupos están inactivos?",
];

const ESTADO_TONE: Record<string, Tone> = { activo: "ok", atencion: "warning", inactivo: "danger" };
const NIVEL_TONE: Record<string, Tone> = { alto: "danger", medio: "warning", bajo: "ok" };

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d} de ${meses[(m ?? 1) - 1]} de ${y}`;
}
function hora(ts: string): string {
  const dt = new Date(ts);
  return dt.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function InicioPage() {
  const [data, setData] = useState<Executive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bullets, setBullets] = useState<AiBullet[] | null>(null);
  const [aiSource, setAiSource] = useState<string>("");

  // Buscador
  const [chip, setChip] = useState("mensajes");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  // Preguntale a la IA
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState<{ answer: string; source: string } | null>(null);
  const [pensando, setPensando] = useState(false);

  useEffect(() => {
    getExecutive().then(setData).catch((e) => setError(e.message));
    getAiSummary()
      .then((r) => {
        setBullets(r.bullets);
        setAiSource(r.source);
      })
      .catch(() => setBullets([]));
  }, []);

  async function runSearch() {
    if (!q.trim()) return;
    setHits(await search(q, chip).catch(() => []));
  }
  async function preguntar(texto: string) {
    setPregunta(texto);
    setPensando(true);
    setRespuesta(await askAi(texto).catch(() => ({ answer: "No pude responder ahora.", source: "error" })));
    setPensando(false);
  }

  return (
    <div className="min-h-screen md:flex">
      {/* ── Sidebar (md+) ──────────────────────────────────────────────── */}
      <aside className="hidden w-56 shrink-0 border-r border-line bg-white px-3 py-5 md:block">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">▮▮</span>
        </div>
        <nav className="space-y-1">
          {NAV.map(([label, active]) => (
            <a
              key={label}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                active ? "bg-brand-soft text-brand" : "text-muted hover:bg-soft"
              }`}
            >
              {label}
              {label === "Oportunidades" && (
                <span className="ml-auto rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">NUEVO</span>
              )}
            </a>
          ))}
        </nav>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>}

        {/* Header */}
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">
              ¡Hola Cecilia! <span className="text-brand">👋</span>
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {data ? `Este es el resumen de hoy, ${fechaLarga(data.fecha_et)}` : "Cargando resumen…"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && data.alertas.length > 0 && (
              <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
                🔔
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-danger text-[10px] font-bold text-white">
                  {data.alertas.length}
                </span>
              </span>
            )}
            <span className="flex items-center gap-2">
              <Avatar name="Cecilia N" />
              <span className="hidden text-sm sm:block">
                <span className="block font-semibold text-ink">Cecilia</span>
                <span className="block text-xs text-muted">Líder Comercial</span>
              </span>
            </span>
          </div>
        </header>

        {/* Buscador + chips */}
        <Card className="mb-6 p-4">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Buscar mensajes, personas, grupos, pendientes, eventos y más…"
              className="w-full rounded-lg bg-soft px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none"
            />
            <button onClick={runSearch} className="shrink-0 rounded-lg bg-brand px-4 text-sm font-semibold text-white">
              Buscar
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => setChip(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  chip === c ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-soft"
                }`}
              >
                {cap(c)}
              </button>
            ))}
          </div>
          {hits !== null && (
            <div className="mt-3 border-t border-line pt-3">
              {hits.length === 0 ? (
                <p className="text-sm text-muted">
                  Sin resultados para “{q}”. El buscador hoy cubre mensajes, audios e imágenes; el resto se cablea con F-002.
                </p>
              ) : (
                <ul className="space-y-2">
                  {hits.slice(0, 8).map((h) => (
                    <li key={h.message_id} className="rounded-lg bg-soft px-3 py-2 text-sm">
                      <span className="text-ink">{h.texto}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {h.remitente} · {h.chat}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        {data && (
          <div className="space-y-4">
            {/* Fila 1: Resumen IA + Salud */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5 md:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">
                    ✦ Resumen ejecutivo IA
                  </h2>
                  {aiSource && (
                    <Badge tone={aiSource === "ia" ? "ok" : "neutral"}>
                      {aiSource === "ia" ? "IA" : "automático"}
                    </Badge>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ul className="space-y-2.5">
                    {(bullets ?? []).map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink2">
                        <span className="mt-1.5">
                          <ToneDot tone={b.tono} />
                        </span>
                        <span>{b.texto}</span>
                      </li>
                    ))}
                    {bullets === null && <li className="text-sm text-muted">Analizando el día…</li>}
                  </ul>
                  <div className="rounded-xl bg-soft p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted">
                      <span>Actividad (7 días)</span>
                      {data.pulso.delta_pct !== null && (
                        <Badge tone={data.pulso.delta_pct >= 0 ? "ok" : "danger"}>
                          {data.pulso.delta_pct >= 0 ? "+" : ""}
                          {data.pulso.delta_pct}%
                        </Badge>
                      )}
                    </div>
                    <Sparkline data={data.pulso.serie_7d} />
                    <p className="mt-1 text-xs text-faint">
                      {data.pulso.mensajes_hoy} mensajes hoy · {data.pulso.grupos_activos} grupos activos
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="flex flex-col items-center justify-center p-5">
                <h2 className="mb-2 self-start text-sm font-bold uppercase tracking-wide text-brand">Salud del equipo</h2>
                <Gauge score={data.salud.score} label={data.salud.label} tono={data.salud.tono} />
                <p className="mt-1 text-center text-xs text-muted">Estás en un buen camino</p>
              </Card>
            </div>

            {/* Fila 2: Alertas · Oportunidades · Pendientes */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-danger">
                  Alertas críticas
                  <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] text-white">{data.alertas.length}</span>
                </h2>
                <ul className="space-y-3">
                  {data.alertas.map((a, i) => (
                    <li key={i} className="border-l-4 pl-3" style={{ borderColor: "transparent" }}>
                      <span className="flex items-start gap-2">
                        <ToneDot tone={a.tono} />
                        <span>
                          <span className="block text-sm font-semibold text-ink">{a.titulo}</span>
                          <span className="block text-xs text-muted">{a.detalle}</span>
                        </span>
                      </span>
                    </li>
                  ))}
                  {data.alertas.length === 0 && <li className="text-sm text-muted">Sin alertas. 🎉</li>}
                </ul>
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">
                  Oportunidades detectadas por IA
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] text-white">{data.oportunidades.length}</span>
                </h2>
                <ul className="space-y-3">
                  {data.oportunidades.map((o, i) => (
                    <li key={i} className="flex items-start justify-between gap-2">
                      <span>
                        <span className="block text-sm font-semibold text-ink">{o.titulo}</span>
                        <span className="block text-xs text-muted">{o.detalle}</span>
                      </span>
                      <Badge tone={NIVEL_TONE[o.nivel] ?? "neutral"}>{cap(o.nivel)}</Badge>
                    </li>
                  ))}
                  {data.oportunidades.length === 0 && <li className="text-sm text-muted">—</li>}
                </ul>
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">Pendientes</h2>
                <Donut
                  total={data.pendientes.total}
                  segments={[
                    { value: data.pendientes.criticos, tone: "danger", label: "Críticos" },
                    { value: data.pendientes.en_proceso, tone: "warning", label: "En proceso" },
                    { value: data.pendientes.pendientes, tone: "brand", label: "Pendientes" },
                  ]}
                />
              </Card>
            </div>

            {/* Fila 3: Ranking · Grupos */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">Ranking de agentes</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-faint">
                      <th className="pb-2 font-medium">Agente</th>
                      <th className="pb-2 text-right font-medium">Inter.</th>
                      <th className="pb-2 text-right font-medium">Cerrados</th>
                      <th className="pb-2 text-right font-medium">Part.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ranking.map((a, i) => (
                      <tr key={a.nombre} className="border-t border-line">
                        <td className="py-2">
                          <span className="flex items-center gap-2">
                            <span className="w-4 text-xs font-bold text-faint">{i + 1}</span>
                            <Avatar name={a.nombre} />
                            <span className="font-medium text-ink">{a.nombre}</span>
                          </span>
                        </td>
                        <td className="py-2 text-right tabular-nums text-ink2">{a.interacciones}</td>
                        <td className="py-2 text-right tabular-nums text-ink2">{a.pendientes_cerrados}</td>
                        <td className="py-2 text-right font-semibold text-brand">{a.participacion}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">Actividad de grupos</h2>
                <ul className="space-y-3">
                  {data.grupos.map((g) => (
                    <li key={g.nombre} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">#</span>
                        <span className="font-medium text-ink">{g.nombre}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Badge tone={ESTADO_TONE[g.estado]}>{cap(g.estado === "atencion" ? "Atención" : g.estado)}</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <ToneDot tone={g.actividad === "alta" ? "ok" : g.actividad === "media" ? "warning" : "danger"} />
                          {cap(g.actividad)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Fila 4: Timeline · Preguntale a la IA */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">Línea de tiempo · Hoy</h2>
                <ul className="space-y-4">
                  {data.timeline.map((e, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-1 shrink-0">
                        <ToneDot tone={e.tono} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-faint">{hora(e.ts)}</span>
                          <Badge tone={e.tono}>{e.tipo}</Badge>
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold text-ink">{e.titulo}</span>
                        {e.detalle && <span className="block text-xs text-muted">{e.detalle}</span>}
                      </span>
                    </li>
                  ))}
                  {data.timeline.length === 0 && <li className="text-sm text-muted">Sin eventos hoy.</li>}
                </ul>
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">
                  ✦ Preguntale a la IA <Badge tone="brand">BETA</Badge>
                </h2>
                {respuesta && (
                  <div className="mb-3 rounded-xl bg-brand-soft p-3 text-sm text-ink2">
                    {respuesta.answer}
                    <span className="mt-1 block text-xs text-faint">
                      {respuesta.source === "ia" ? "Respondido con IA (Gemini)" : "Respuesta automática sobre los datos"}
                    </span>
                  </div>
                )}
                <div className="mb-3 flex flex-wrap gap-2">
                  {PREGUNTAS.map((p) => (
                    <button
                      key={p}
                      onClick={() => preguntar(p)}
                      className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:bg-soft"
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={pregunta}
                    onChange={(e) => setPregunta(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && preguntar(pregunta)}
                    placeholder="Escribí tu pregunta…"
                    className="w-full rounded-lg bg-soft px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none"
                  />
                  <button
                    onClick={() => preguntar(pregunta)}
                    disabled={pensando}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-white disabled:opacity-50"
                  >
                    {pensando ? "…" : "➤"}
                  </button>
                </div>
              </Card>
            </div>

            <p className="pt-2 text-center text-xs text-faint">
              Los datos se actualizan automáticamente cada pocos segundos.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
