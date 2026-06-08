"use client";

// DASHBOARD EJECUTIVO "¡Hola Cecilia!" (Producto ②). Responsive: sidebar + grilla
// en escritorio, una columna en móvil (Principio VI). Todos los bloques leen datos
// REALES del backend, filtrados por el tenant del JWT (FR-009). Los bloques de IA
// usan LiteLLM con fallback determinista. i18n es/en (FR-010, Principio VI):
// se traduce el chrome de UI; el contenido dinámico llega del backend.
import { useEffect, useState } from "react";

import { Avatar, Badge, Donut, Gauge, Sparkline, ToneDot } from "@/components/executive";
import { Card } from "@/components/ui";
import { getUser, logout, requireAuth, type SessionUser } from "@/lib/auth";
import { DEFAULT_LOCALE, getDictionary, getStoredLocale, storeLocale, type Locale } from "@/lib/i18n";
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

const NAV_KEYS = [
  "inicio", "mensajes", "grupos", "eventos", "pendientes", "oportunidades",
  "agentes", "capacitaciones", "reportes", "iaInsights", "ajustes",
] as const;
const CHIP_KEYS = ["mensajes", "audios", "imagenes", "personas", "pendientes", "eventos", "grupos", "capacitaciones"] as const;

const ESTADO_TONE: Record<string, Tone> = { activo: "ok", atencion: "warning", inactivo: "danger" };
const NIVEL_TONE: Record<string, Tone> = { alto: "danger", medio: "warning", bajo: "ok" };

const MESES: Record<Locale, string[]> = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
function fechaLarga(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split("-").map(Number);
  const mes = MESES[locale][(m ?? 1) - 1];
  return locale === "es" ? `${d} de ${mes} de ${y}` : `${mes} ${d}, ${y}`;
}
function hora(ts: string, locale: Locale): string {
  return new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export default function InicioPage() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [data, setData] = useState<Executive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bullets, setBullets] = useState<AiBullet[] | null>(null);
  const [aiSource, setAiSource] = useState<string>("");

  const [chip, setChip] = useState<string>("mensajes");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState<{ answer: string; source: string } | null>(null);
  const [pensando, setPensando] = useState(false);

  const t = getDictionary(locale).inicio;
  const estadoLabel: Record<string, string> = { activo: t.estadoActivo, atencion: t.estadoAtencion, inactivo: t.estadoInactivo };
  const actLabel: Record<string, string> = { alta: t.actAlta, media: t.actMedia, baja: t.actBaja };
  const nivelLabel: Record<string, string> = { alto: t.nivelAlto, medio: t.nivelMedio, bajo: t.nivelBajo };

  useEffect(() => {
    requireAuth();
    setUser(getUser());
    setLocale(getStoredLocale());
  }, []);

  // Recarga los datos cuando cambia el idioma (el backend localiza salud/alertas/
  // timeline/bullets según el lang).
  useEffect(() => {
    getExecutive(locale).then(setData).catch((e) => setError(e.message));
    setBullets(null);
    getAiSummary(locale)
      .then((r) => {
        setBullets(r.bullets);
        setAiSource(r.source);
      })
      .catch(() => setBullets([]));
  }, [locale]);

  async function runSearch() {
    if (!q.trim()) return;
    setHits(await search(q, chip).catch(() => []));
  }
  async function preguntar(texto: string) {
    setPregunta(texto);
    setPensando(true);
    setRespuesta(await askAi(texto, locale).catch(() => ({ answer: "—", source: "error" })));
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
          {NAV_KEYS.map((key) => (
            <a
              key={key}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                key === "inicio" ? "bg-brand-soft text-brand" : "text-muted hover:bg-soft"
              }`}
            >
              {t.nav[key]}
              {key === "oportunidades" && (
                <span className="ml-auto rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">{t.newBadge}</span>
              )}
            </a>
          ))}
        </nav>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>}

        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">
              {t.hello} {user?.nombre ?? "Cecilia"}! <span className="text-brand">👋</span>
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {data ? `${t.todaySummary} ${fechaLarga(data.fecha_et, locale)}` : t.loading}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { const n = locale === "es" ? "en" : "es"; setLocale(n); storeLocale(n); }}
              className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-muted shadow-card"
              aria-label="toggle language"
            >
              {locale === "es" ? "EN" : "ES"}
            </button>
            {data && data.alertas.length > 0 && (
              <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
                🔔
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-danger text-[10px] font-bold text-white">
                  {data.alertas.length}
                </span>
              </span>
            )}
            <span className="flex items-center gap-2">
              <Avatar name={user?.nombre ?? "Cecilia"} />
              <span className="hidden text-sm sm:block">
                <span className="block font-semibold text-ink">{user?.nombre ?? "Cecilia"}</span>
                <button onClick={logout} className="block text-xs text-muted hover:text-brand">
                  {t.role} · {t.logout}
                </button>
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
              placeholder={t.searchPlaceholder}
              className="w-full rounded-lg bg-soft px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none"
            />
            <button onClick={runSearch} className="shrink-0 rounded-lg bg-brand px-4 text-sm font-semibold text-white">
              {t.searchBtn}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CHIP_KEYS.map((c) => (
              <button
                key={c}
                onClick={() => setChip(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  chip === c ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-soft"
                }`}
              >
                {t.chips[c]}
              </button>
            ))}
          </div>
          {hits !== null && (
            <div className="mt-3 border-t border-line pt-3">
              {hits.length === 0 ? (
                <p className="text-sm text-muted">
                  {t.searchEmptyPre} “{q}”. {t.searchEmptyPost}
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
                    ✦ {t.execSummary}
                  </h2>
                  {aiSource && (
                    <Badge tone={aiSource === "ia" ? "ok" : "neutral"}>{aiSource === "ia" ? t.srcIa : t.srcAuto}</Badge>
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
                    {bullets === null && <li className="text-sm text-muted">{t.analyzing}</li>}
                  </ul>
                  <div className="rounded-xl bg-soft p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted">
                      <span>{t.activity7d}</span>
                      {data.pulso.delta_pct !== null && (
                        <Badge tone={data.pulso.delta_pct >= 0 ? "ok" : "danger"}>
                          {data.pulso.delta_pct >= 0 ? "+" : ""}
                          {data.pulso.delta_pct}%
                        </Badge>
                      )}
                    </div>
                    <Sparkline data={data.pulso.serie_7d} />
                    <p className="mt-1 text-xs text-faint">
                      {data.pulso.mensajes_hoy} {t.msgsToday} · {data.pulso.grupos_activos} {t.groupsActive}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="flex flex-col items-center justify-center p-5">
                <h2 className="mb-2 self-start text-sm font-bold uppercase tracking-wide text-brand">{t.health}</h2>
                <Gauge score={data.salud.score} label={data.salud.label} tono={data.salud.tono} />
                <p className="mt-1 text-center text-xs text-muted">{t.healthHint}</p>
              </Card>
            </div>

            {/* Fila 2: Alertas · Oportunidades · Pendientes */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-danger">
                  {t.alerts}
                  <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] text-white">{data.alertas.length}</span>
                </h2>
                <ul className="space-y-3">
                  {data.alertas.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1">
                        <ToneDot tone={a.tono} />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">{a.titulo}</span>
                        <span className="block text-xs text-muted">{a.detalle}</span>
                      </span>
                    </li>
                  ))}
                  {data.alertas.length === 0 && <li className="text-sm text-muted">{t.noAlerts}</li>}
                </ul>
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">
                  {t.opportunities}
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] text-white">{data.oportunidades.length}</span>
                </h2>
                <ul className="space-y-3">
                  {data.oportunidades.map((o, i) => (
                    <li key={i} className="flex items-start justify-between gap-2">
                      <span>
                        <span className="block text-sm font-semibold text-ink">{o.titulo}</span>
                        <span className="block text-xs text-muted">{o.detalle}</span>
                      </span>
                      <Badge tone={NIVEL_TONE[o.nivel] ?? "neutral"}>{nivelLabel[o.nivel] ?? o.nivel}</Badge>
                    </li>
                  ))}
                  {data.oportunidades.length === 0 && <li className="text-sm text-muted">—</li>}
                </ul>
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{t.pending}</h2>
                <Donut
                  total={data.pendientes.total}
                  segments={[
                    { value: data.pendientes.criticos, tone: "danger", label: t.pendCritical },
                    { value: data.pendientes.en_proceso, tone: "warning", label: t.pendInProgress },
                    { value: data.pendientes.pendientes, tone: "brand", label: t.pendPending },
                  ]}
                />
              </Card>
            </div>

            {/* Fila 3: Ranking · Grupos */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{t.ranking}</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-faint">
                      <th className="pb-2 font-medium">{t.thAgent}</th>
                      <th className="pb-2 text-right font-medium">{t.thInter}</th>
                      <th className="pb-2 text-right font-medium">{t.thClosed}</th>
                      <th className="pb-2 text-right font-medium">{t.thShare}</th>
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
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{t.groups}</h2>
                <ul className="space-y-3">
                  {data.grupos.map((g) => (
                    <li key={g.nombre} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">#</span>
                        <span className="font-medium text-ink">{g.nombre}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Badge tone={ESTADO_TONE[g.estado]}>{estadoLabel[g.estado]}</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <ToneDot tone={g.actividad === "alta" ? "ok" : g.actividad === "media" ? "warning" : "danger"} />
                          {actLabel[g.actividad]}
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
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{t.timeline}</h2>
                <ul className="space-y-4">
                  {data.timeline.map((e, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-1 shrink-0">
                        <ToneDot tone={e.tono} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-faint">{hora(e.ts, locale)}</span>
                          <Badge tone={e.tono}>{e.tipo}</Badge>
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold text-ink">{e.titulo}</span>
                        {e.detalle && <span className="block text-xs text-muted">{e.detalle}</span>}
                      </span>
                    </li>
                  ))}
                  {data.timeline.length === 0 && <li className="text-sm text-muted">{t.noEvents}</li>}
                </ul>
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">
                  ✦ {t.askAi} <Badge tone="brand">BETA</Badge>
                </h2>
                {respuesta && (
                  <div className="mb-3 rounded-xl bg-brand-soft p-3 text-sm text-ink2">
                    {respuesta.answer}
                    <span className="mt-1 block text-xs text-faint">
                      {respuesta.source === "ia" ? t.answeredIa : t.answeredAuto}
                    </span>
                  </div>
                )}
                <div className="mb-3 flex flex-wrap gap-2">
                  {t.questions.map((p) => (
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
                    placeholder={t.askPlaceholder}
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

            <p className="pt-2 text-center text-xs text-faint">{t.autoRefresh}</p>
          </div>
        )}
      </main>
    </div>
  );
}
