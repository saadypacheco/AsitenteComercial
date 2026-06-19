"use client";

// INICIO — Centro de Control Comercial Inteligente. Responde de un vistazo: cómo
// está el equipo, qué clientes requieren atención, qué oportunidades hay, qué
// resolver hoy y qué recomienda la IA. Datos reales (rebanada F-002) + derivados.
import { useEffect, useState } from "react";

import { Avatar, Badge, Sparkline, ToneDot } from "@/components/executive";
import { Card } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { askAi, getCommand, getLiderOnboarding, search, type Command, type SearchHit, type Tone } from "@/lib/queries/executive";

const CHIP_KEYS = ["mensajes", "audios", "imagenes", "personas", "pendientes", "eventos", "grupos", "capacitaciones"] as const;
const BORDER: Record<Tone, string> = { brand: "border-t-brand", ok: "border-t-ok", danger: "border-t-danger", warning: "border-t-warning", neutral: "border-t-line" };
const TXT: Record<Tone, string> = { brand: "text-brand", ok: "text-ok", danger: "text-danger", warning: "text-warning", neutral: "text-ink" };
const PRIO_TONE: Record<string, Tone> = { alta: "danger", media: "warning", baja: "ok", critico: "danger", alto: "warning" };
const NIVEL_TONE: Record<string, Tone> = { alto: "danger", medio: "warning", bajo: "ok" };

function money(n: number) {
  return "$" + (n ?? 0).toLocaleString("en-US");
}

export default function InicioPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.command;

  const [user, setUser] = useState("Cecilia");
  const [c, setC] = useState<Command | null>(null);

  const [chip, setChip] = useState<string>("mensajes");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState<{ answer: string; source: string } | null>(null);
  const [pensando, setPensando] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUser(u?.nombre ?? "Cecilia");
    if (u?.rol === "lider") {
      getLiderOnboarding().then((d) => { if (!d.completado) window.location.href = "/lider/bienvenida"; }).catch(() => {});
    }
  }, []);
  useEffect(() => {
    getCommand(locale).then(setC).catch(() => setC(null));
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
  const hace = (h: number) => (locale === "es" ? `hace ${h}h` : `${h}h ago`);
  const nivelLabel: Record<string, string> = { alto: dict.inicio.nivelAlto, medio: dict.inicio.nivelMedio, bajo: dict.inicio.nivelBajo };

  const k = c?.kpis;
  const kpis = k
    ? [
        { icon: "💬", label: t.kpiConversaciones, value: k.conversaciones.value, delta: k.conversaciones.delta, tone: k.conversaciones.tono },
        { icon: "💵", label: t.kpiVentas, value: k.ventas.value, delta: k.ventas.delta, tone: k.ventas.tono, sub: k.ventas.valor ? money(k.ventas.valor) : undefined },
        { icon: "🚨", label: t.kpiCriticos, value: k.criticos.value, delta: null, tone: k.criticos.tono },
        { icon: "⚠️", label: t.kpiRiesgo, value: k.riesgo.value, delta: null, tone: k.riesgo.tono },
        { icon: "🟢", label: t.kpiConectados, value: `${k.conectados.value}/${k.conectados.total}`, delta: null, tone: k.conectados.tono },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">
          {dict.inicio.hello} {user}! <span className="text-brand">👋</span>
        </h1>
        <p className="mt-0.5 text-sm text-muted">{dict.inicio.todaySummary} {new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</p>
      </header>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((x) => (
          <div key={x.label} className={`rounded-2xl border border-line border-t-[3px] bg-white p-4 shadow-card ${BORDER[x.tone]}`}>
            <div className="flex items-center justify-between">
              <span className="text-lg">{x.icon}</span>
              {x.delta != null && (
                <span className={`text-xs font-bold ${x.delta >= 0 ? "text-ok" : "text-danger"}`}>
                  {x.delta >= 0 ? "▲" : "▼"} {Math.abs(x.delta)}%
                </span>
              )}
            </div>
            <p className={`mt-2 text-2xl font-bold leading-none ${TXT[x.tone]}`}>{x.value}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted">{x.label}</p>
            {x.sub && <p className="mt-0.5 text-[11px] font-semibold text-ok">{x.sub}</p>}
          </div>
        ))}
        {!c && Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white shadow-card" />)}
      </div>

      {/* ── Buscador global (destacado) ───────────────────────────────────── */}
      <Card className="mb-5 border-t-[3px] border-t-brand p-4 shadow-card-lg">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder={locale === "es" ? "Buscar mensajes, clientes, teléfonos, grupos, eventos o pendientes…" : "Search messages, clients, phones, groups, events or pending items…"}
              className="w-full rounded-xl border-2 border-line bg-white py-3 pl-11 pr-4 text-base text-ink shadow-card transition placeholder:text-faint focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15" />
          </div>
          <button onClick={runSearch} className="shrink-0 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-card transition hover:opacity-95">{dict.inicio.searchBtn}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHIP_KEYS.map((x) => (
            <button key={x} onClick={() => setChip(x)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${chip === x ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-soft"}`}>
              {dict.inicio.chips[x]}
            </button>
          ))}
        </div>
        {hits !== null && (
          <div className="mt-3 border-t border-line pt-3">
            {hits.length === 0 ? (
              <p className="text-sm text-muted">{dict.inicio.searchEmptyPre} “{q}”. {dict.inicio.searchEmptyPost}</p>
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

      {/* ── Recomendaciones IA (hero) ─────────────────────────────────────── */}
      <Card className="mb-5 overflow-hidden">
        <div className="bg-gradient-to-r from-brand to-brand-2 px-5 py-3">
          <h2 className="text-sm font-bold text-white">🧠 {t.iaFor} {user}</h2>
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-2">
          {c?.recomendaciones.map((r, i) => (
            <div key={i} className="flex items-start gap-3 bg-white p-4">
              <ToneDot tone={r.tono} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">{r.accion}</p>
                  <Badge tone={PRIO_TONE[r.prioridad] ?? "neutral"}>{t.prio[r.prioridad as keyof typeof t.prio] ?? r.prioridad}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted">{r.motivo}</p>
              </div>
            </div>
          ))}
          {c && c.recomendaciones.length === 0 && <div className="bg-white p-6 text-sm text-muted">{t.noRecs}</div>}
          {!c && <div className="bg-white p-6 text-sm text-muted">…</div>}
        </div>
      </Card>

      {/* ── Estado del equipo · Alertas críticas ──────────────────────────── */}
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">👥 {t.team}</h2>
          <ul className="space-y-3">
            {c?.equipo.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={e.nombre} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{e.nombre}</span>
                    <span className="block text-xs text-muted">
                      {e.estado === "excelente" ? `${e.cerrados} ${t.deals}` : `${e.abiertas} ${t.openConv}`}
                    </span>
                  </span>
                </span>
                <Badge tone={e.tono}>{t.estadoEquipo[e.estado as keyof typeof t.estadoEquipo] ?? e.estado}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-danger">
            🚨 {t.alerts}
            <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] text-white">{c?.alertas.length ?? 0}</span>
          </h2>
          <ul className="space-y-2.5">
            {c?.alertas.map((a) => (
              <li key={a.id} className="rounded-xl border border-line border-l-4 border-l-danger bg-white p-3 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold text-ink">
                      {a.cliente}
                      {a.vip && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">★ {t.vip}</span>}
                    </p>
                    <p className="text-xs text-muted">{a.titulo}</p>
                    <p className="mt-1 text-xs text-faint">
                      ⏱ {hace(a.horas)} · {t.responsible}: {a.responsable ?? t.noResponsible}
                    </p>
                  </div>
                  <button className="shrink-0 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">{t.quickAct}</button>
                </div>
              </li>
            ))}
            {c && c.alertas.length === 0 && <li className="text-sm text-muted">🎉</li>}
          </ul>
        </Card>
      </div>

      {/* ── Top Agentes · Oportunidades IA ────────────────────────────────── */}
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">🏆 {t.topAgents}</h2>
          <ul className="space-y-2">
            {c?.ranking.map((r, i) => (
              <li key={r.nombre} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-soft">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "text-faint"}`}>
                  {i + 1}
                </span>
                <Avatar name={r.nombre} />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.nombre}</span>
                <span className="shrink-0 text-right text-xs">
                  <span className="block font-bold text-ink">{r.ventas} <span className="font-normal text-muted">{t.sales.toLowerCase()}</span></span>
                  <span className="block text-brand">{r.conversiones}% {t.conversions.toLowerCase()}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">✦ {t.opps}</h2>
          <ul className="space-y-3">
            {c?.oportunidades.map((o) => (
              <li key={o.id} className="rounded-xl border border-line bg-white p-3 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink">{o.titulo}</p>
                  {o.nivel && <Badge tone={NIVEL_TONE[o.nivel] ?? "neutral"}>{nivelLabel[o.nivel] ?? o.nivel}</Badge>}
                </div>
                {o.producto && <p className="text-xs text-muted">{o.producto}</p>}
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${o.probabilidad}%` }} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">{o.probabilidad}% {t.closeProb}</p>
                  </div>
                  {o.potencial > 0 && <span className="shrink-0 text-sm font-bold text-ok">{money(o.potencial)}</span>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ── Actividad · Preguntale a la IA ────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-brand">📈 {t.activity}</h2>
          {c && <Sparkline data={c.actividad.serie_7d} />}
          <p className="mt-1 text-xs text-faint">{c?.actividad.total_7d ?? 0} {t.messages7d}</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">
            ✦ {dict.inicio.askAi} <Badge tone="brand">BETA</Badge>
          </h2>
          {respuesta && (
            <div className="mb-3 rounded-xl bg-brand-soft p-3 text-sm text-ink2">
              {respuesta.answer}
              <span className="mt-1 block text-xs text-faint">{respuesta.source === "ia" ? dict.inicio.answeredIa : dict.inicio.answeredAuto}</span>
            </div>
          )}
          <div className="mb-3 flex flex-wrap gap-2">
            {dict.inicio.questions.map((p) => (
              <button key={p} onClick={() => preguntar(p)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:bg-soft">{p}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && preguntar(pregunta)}
              placeholder={dict.inicio.askPlaceholder} className="w-full rounded-lg bg-soft px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none" />
            <button onClick={() => preguntar(pregunta)} disabled={pensando} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-white disabled:opacity-50">
              {pensando ? "…" : "➤"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
