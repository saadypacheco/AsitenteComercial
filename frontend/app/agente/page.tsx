"use client";

// App del agente — tema LIGHT estilo Duolingo / Execally.
// Paleta: fondo #F8FAFC, cards #FFFFFF, sidebar #F0F4F8,
// acento #38BDF8, éxito #34D399, racha #FB923C, bloqueado #CBD5E1.
import { Fragment, useEffect, useState } from "react";

import { getUser, logout, requireAgent } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import {
  askCoach, avanzar, getAgenda, getJourney, getMe, getRanking, getRuta, simChat,
  type AgenteMe, type CoachResp, type Journey, type Mission, type RankItem, type Ruta, type Sesion, type SimMsg,
} from "@/lib/queries/agente";

type Tab = "hoy" | "agenda" | "ruta" | "progreso" | "logros" | "simular" | "ayuda";

const PODIUM = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-orange-400 to-amber-500"];

// Constantes de diseño
const CARD = "rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),_0_2px_4px_-1px_rgba(0,0,0,0.03)]";
const STITLE = "mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B]";
const BTN_PRIMARY = "rounded-xl bg-[#38BDF8] py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_-2px_rgba(56,189,248,0.4)] transition active:scale-[0.98]";
const INPUT = "w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20";

export default function AgentePage() {
  const { locale, t: dict } = useLocale();
  const t = dict.agente;
  const [nombre, setNombre] = useState("");
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [me, setMe] = useState<AgenteMe | null>(null);
  const [agenda, setAgenda] = useState<Sesion[]>([]);
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [tab, setTab] = useState<Tab>("hoy");
  const [busy, setBusy] = useState(false);

  const [pregunta, setPregunta] = useState("");
  const [resp, setResp] = useState<CoachResp | null>(null);
  const [pensando, setPensando] = useState(false);

  const [simScenario, setSimScenario] = useState("primera_llamada");
  const [simHistoria, setSimHistoria] = useState<SimMsg[]>([]);
  const [simMsg, setSimMsg] = useState("");
  const [simResp, setSimResp] = useState<{ cliente: string; feedback: string; terminado: boolean } | null>(null);
  const [simBusy, setSimBusy] = useState(false);

  function reload() {
    getRuta(locale).then(setRuta).catch(() => setRuta(null));
    getMe(locale).then(setMe).catch(() => setMe(null));
    getAgenda(locale).then(setAgenda).catch(() => setAgenda([]));
    getRanking().then(setRanking).catch(() => setRanking([]));
    getJourney(locale).then(setJourney).catch(() => setJourney(null));
  }
  useEffect(() => {
    requireAgent();
    setNombre(getUser()?.nombre ?? "");
  }, []);
  useEffect(reload, [locale]);

  async function siguiente() {
    setBusy(true);
    await avanzar().catch(() => {});
    reload();
    setBusy(false);
  }
  async function preguntar() {
    if (!pregunta.trim()) return;
    setPensando(true);
    setResp(await askCoach(pregunta, locale).catch(() => ({ answer: "—", fuentes: [], source: "sin_resultados" as const })));
    setPensando(false);
  }
  async function simEnviar() {
    if (!simMsg.trim() || simBusy) return;
    const msgTexto = simMsg.trim();
    setSimMsg("");
    setSimBusy(true);
    const nuevaHistoria: SimMsg[] = [...simHistoria, { rol: "agente", texto: msgTexto }];
    setSimHistoria(nuevaHistoria);
    const r = await simChat(msgTexto, simScenario, simHistoria, locale).catch(() => null);
    if (r) {
      setSimHistoria([...nuevaHistoria, { rol: "cliente", texto: r.respuesta_cliente }]);
      setSimResp({ cliente: r.respuesta_cliente, feedback: r.feedback, terminado: r.terminado });
    }
    setSimBusy(false);
  }
  function simReset() {
    setSimHistoria([]);
    setSimResp(null);
    setSimMsg("");
  }

  const actual = ruta?.etapas.find((e) => e.estado === "en_curso");
  const proxMision = journey?.missions.find((m) => !m.done) ?? null;
  const stepWord = (n: number) => (locale === "es" ? `Paso ${n}` : `Step ${n}`);
  const dt = (s: string) => new Date(s);
  const isToday = (s: string) => dt(s).toDateString() === new Date().toDateString();
  const fmtDay = (s: string) => dt(s).toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short" });
  const fmtTime = (s: string) => dt(s).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  const TABS: { k: Tab; ic: string; label: string }[] = [
    { k: "hoy", ic: "🏠", label: t.tabHoy },
    { k: "agenda", ic: "📅", label: t.tabAgenda },
    { k: "ruta", ic: "🎯", label: t.tabRuta },
    { k: "progreso", ic: "📈", label: t.tabProgreso },
    { k: "logros", ic: "🏅", label: t.tabLogros },
    { k: "simular", ic: "🎭", label: locale === "en" ? "Simulate" : "Simular" },
  ];

  // ── Sub-componentes inline ────────────────────────────────────────────────

  function ZoomBtn({ url }: { url: string | null }) {
    return (
      <a href={url ?? "#"} target="_blank" rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#38BDF8]/30 bg-[#F0F9FF] px-3.5 py-1.5 text-xs font-bold text-[#0284C7] transition hover:bg-[#E0F2FE]">
        🎥 {t.joinZoom}
      </a>
    );
  }

  function MissionCard({ m, idx }: { m: Mission; idx: number }) {
    const iconBgs = [
      "bg-[#38BDF8]/10 text-[#0284C7]",
      "bg-violet-100 text-violet-600",
      "bg-amber-100 text-amber-600",
      "bg-[#34D399]/10 text-[#059669]",
    ];
    return (
      <div className={`rounded-2xl border p-4 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.04)] ${m.done ? "border-[#34D399]/30 bg-[#F0FDF4]" : "border-[#E2E8F0] bg-white"}`}>
        <span className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${m.done ? "bg-[#34D399]/10 text-[#059669]" : iconBgs[idx % iconBgs.length]}`}>
          {m.done ? "✓" : m.icon}
        </span>
        <p className={`mt-2 text-sm ${m.done ? "text-[#94A3B8] line-through" : "font-semibold text-[#1E293B]"}`}>{m.label}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-600">+{m.xp} XP</span>
          {m.done
            ? <span className="text-xs font-bold text-[#059669]">✓ {t.completedLabel}</span>
            : <button onClick={() => setTab("ruta")} className="rounded-full bg-[#38BDF8] px-3 py-1 text-xs font-bold text-white shadow-[0_2px_8px_-2px_rgba(56,189,248,0.5)]">{t.startBtn}</button>}
        </div>
      </div>
    );
  }

  function Streak() {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FB923C]/25 bg-[#FFF7ED] px-3 py-1 text-xs font-extrabold text-[#EA580C]">
        🔥 {journey?.racha ?? 0} {t.streakDays}
      </span>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl">

        {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-[#E2E8F0] bg-[#F0F4F8] px-4 py-5 lg:flex">
          <div className="mb-6 flex items-center gap-2 px-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#38BDF8] text-base shadow-[0_4px_12px_-2px_rgba(56,189,248,0.4)]">🚀</span>
            <span className="text-lg font-black tracking-tight text-[#1E293B]">Execally</span>
          </div>

          <nav className="space-y-1">
            {TABS.map((x) => (
              <button key={x.k} onClick={() => setTab(x.k)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  tab === x.k
                    ? "bg-[#38BDF8] text-white shadow-[0_4px_12px_-2px_rgba(56,189,248,0.35)]"
                    : "text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#1E293B]"}`}>
                <span className="text-lg">{x.ic}</span>{x.label}
              </button>
            ))}
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#94A3B8]">
              <span className="text-lg">🛍️</span>{t.store}
              <span className="ml-auto rounded-full bg-[#FB923C] px-2 py-0.5 text-[9px] font-bold text-white">{t.soon}</span>
            </div>
          </nav>

          {journey && (
            <div className="mt-auto rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#38BDF8] text-sm font-black text-white">{journey.level.n}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1E293B]">{nombre || "—"}</p>
                  <p className="text-[11px] text-[#64748B]">{t.level} {journey.level.n} · {journey.level.name}</p>
                </div>
              </div>
              <div className="mt-2"><Streak /></div>
            </div>
          )}
        </aside>

        {/* ── Main ──────────────────────────────────────────────────────── */}
        <div className="flex min-h-screen flex-1 flex-col">

          {/* Header */}
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#E2E8F0] bg-white/90 px-5 py-3.5 backdrop-blur-md">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#38BDF8] text-xl shadow-[0_4px_12px_-2px_rgba(56,189,248,0.35)] lg:hidden">👩‍💼</span>
            <div className="flex-1">
              <h1 className="text-base font-extrabold text-[#1E293B]">{t.hello}, {nombre} 👋</h1>
              <p className="text-xs font-medium text-[#64748B]">{me?.ciudad}</p>
            </div>
            <span className="hidden sm:block"><Streak /></span>
            <button onClick={logout}
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition hover:bg-[#F0F4F8]"
              title={t.logout}>⎋</button>
          </header>

          <main className="flex-1 px-4 py-4 lg:px-8 lg:py-6">

            {/* ── HOY ─────────────────────────────────────────────────── */}
            {tab === "hoy" && (
              <div className="space-y-4 lg:space-y-6">

                {/* Hero nivel + Resumen */}
                <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
                  {journey && (
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#38BDF8] to-[#7DD3FC] p-5 shadow-[0_8px_24px_-6px_rgba(56,189,248,0.45)] lg:col-span-2">
                      <span className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/10" />
                      <span className="pointer-events-none absolute bottom-2 right-4 text-5xl opacity-10">🚀</span>
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/40 bg-white/20 text-lg font-black text-white">
                            {journey.level.n}
                          </span>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">{t.level} {journey.level.n}</p>
                            <p className="text-2xl font-black leading-tight text-white">{journey.level.name}</p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/30 bg-white/20 px-3 py-1.5 text-white backdrop-blur">
                          <p className="text-lg font-black leading-none">⭐ {journey.xp}</p>
                          <p className="text-center text-[10px] font-bold">XP</p>
                        </div>
                      </div>
                      {journey.level.next_name ? (
                        <div className="relative mt-4">
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
                            <div className="h-full rounded-full bg-white transition-all duration-700"
                              style={{ width: `${journey.level.pct_to_next}%` }} />
                          </div>
                          <p className="mt-1.5 text-[11px] font-semibold text-white/80">
                            {journey.level.xp_into}/{journey.level.xp_span} XP → {journey.level.next_name}
                          </p>
                        </div>
                      ) : (
                        <p className="relative mt-4 text-sm font-bold text-white">🏆 {t.maxLevel}</p>
                      )}
                    </div>
                  )}

                  {/* Resumen rápido */}
                  {journey && (
                    <div className={CARD}>
                      <p className={STITLE}>📊 {t.resumenTitle}</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <Mini ic="📚" n={journey.resumen.etapas} lbl={t.statStages} bg="bg-[#38BDF8]/10 text-[#0284C7]" />
                        <Mini ic="🎥" n={journey.resumen.zoom} lbl="Zoom" bg="bg-sky-100 text-sky-600" />
                        <Mini ic="💼" n={journey.resumen.ventas} lbl={t.statTasks} bg="bg-amber-100 text-amber-600" />
                        <Mini ic="🏅" n={journey.resumen.logros} lbl={t.tabLogros} bg="bg-violet-100 text-violet-600" />
                      </div>
                      <p className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-center text-xs font-semibold text-[#64748B]">
                        {t.weekProgress}: <span className="font-bold text-[#0284C7]">+{journey.resumen.xp_semana} XP</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Journey + Próxima misión */}
                <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
                  {journey && (
                    <div className={`${CARD} lg:col-span-2`}>
                      <p className={STITLE}>🚀 {t.journeyTitle}</p>
                      <div className="flex items-center">
                        {journey.journey.map((s, i) => (
                          <Fragment key={s.key}>
                            {i > 0 && (
                              <span className={`h-1.5 flex-1 rounded-full ${s.done || s.current ? "bg-gradient-to-r from-[#34D399] to-[#38BDF8]" : "bg-[#E2E8F0]"}`} />
                            )}
                            <span title={s.label}
                              className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-base font-bold transition ${
                                s.done
                                  ? "bg-[#34D399] text-white shadow-[0_4px_12px_-2px_rgba(52,211,153,0.4)]"
                                  : s.current
                                  ? "scale-110 bg-[#38BDF8] text-white shadow-[0_4px_16px_-2px_rgba(56,189,248,0.5)] ring-4 ring-[#38BDF8]/20"
                                  : "bg-[#CBD5E1] text-white"}`}>
                              {s.done ? "✓" : s.icon}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                      {(() => {
                        const cur = journey.journey.find((s) => s.current);
                        return cur ? (
                          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm">
                            <span className="font-semibold text-[#64748B]">{t.nowLabel}:</span>
                            <span className="font-extrabold text-[#0284C7]">{cur.icon} {cur.label}</span>
                          </div>
                        ) : (
                          <p className="mt-4 text-center text-sm font-extrabold text-[#059669]">🏆 {t.journeyDone}</p>
                        );
                      })()}
                      {actual && (
                        <button onClick={() => setTab("ruta")}
                          className={`mt-3 w-full ${BTN_PRIMARY}`}>
                          {t.continueBtn} →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Próxima misión */}
                  {proxMision && (
                    <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#38BDF8]/20 bg-gradient-to-br from-[#F0F9FF] to-[#E0F2FE] p-5 shadow-[0_4px_16px_-4px_rgba(56,189,248,0.2)]">
                      <span className="pointer-events-none absolute -bottom-4 -right-3 text-6xl opacity-10">🎯</span>
                      <div className="relative">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#0284C7]">{t.nextMission}</p>
                        <span className="mt-2 inline-block text-3xl">{proxMision.icon}</span>
                        <p className="mt-1 text-lg font-extrabold leading-snug text-[#1E293B]">{proxMision.label}</p>
                        <span className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-600">+{proxMision.xp} XP</span>
                      </div>
                      <button onClick={() => setTab("ruta")}
                        className={`relative mt-4 w-full ${BTN_PRIMARY}`}>
                        {t.startMission}
                      </button>
                    </div>
                  )}
                </div>

                {/* Misiones recomendadas */}
                {journey && journey.missions.length > 0 && (
                  <div>
                    <p className={STITLE}>🎯 {t.recommended}</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {journey.missions.map((m, i) => <MissionCard key={i} m={m} idx={i} />)}
                    </div>
                  </div>
                )}

                {/* Sesiones de hoy */}
                <div className={CARD}>
                  <p className={STITLE}>📅 {t.todaySessions}</p>
                  <div className="space-y-2.5">
                    {agenda.filter((s) => isToday(s.fecha)).map((s) => (
                      <div key={s.id} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                        <p className="text-sm font-bold text-[#1E293B]">{fmtTime(s.fecha)} · {s.nombre}</p>
                        <p className="text-xs text-[#64748B]">{s.duracion_min} min</p>
                        <ZoomBtn url={s.zoom_url} />
                      </div>
                    ))}
                    {agenda.filter((s) => isToday(s.fecha)).length === 0 && (
                      <p className="text-sm text-[#94A3B8]">{t.noSessions}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── AGENDA ──────────────────────────────────────────────── */}
            {tab === "agenda" && (
              <div className={`${CARD} lg:max-w-2xl`}>
                <p className={STITLE}>📅 {t.upcoming}</p>
                <ul className="space-y-2.5">
                  {agenda.map((s) => (
                    <li key={s.id} className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#38BDF8] text-center text-white shadow-[0_4px_12px_-2px_rgba(56,189,248,0.35)]">
                        <span className="text-[10px] font-bold leading-tight">{fmtDay(s.fecha)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#1E293B]">{s.nombre}</p>
                        <p className="text-xs text-[#64748B]">{fmtTime(s.fecha)} · {s.duracion_min} min</p>
                        <ZoomBtn url={s.zoom_url} />
                      </div>
                    </li>
                  ))}
                  {agenda.length === 0 && <li className="text-sm text-[#94A3B8]">{t.noSessions}</li>}
                </ul>
              </div>
            )}

            {/* ── RUTA ────────────────────────────────────────────────── */}
            {tab === "ruta" && ruta && (
              <div className="space-y-4 lg:max-w-2xl">
                <div className={CARD}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-[#1E293B]">{t.overall}</span>
                    <span className="text-sm font-black text-[#0284C7]">{ruta.pct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#34D399] to-[#38BDF8] transition-all duration-700"
                      style={{ width: `${ruta.pct}%` }} />
                  </div>
                </div>
                <div className={CARD}>
                  <p className={STITLE}>🎯 {t.rutaTitle}</p>
                  <ol className="relative space-y-3 pl-10">
                    <span className="absolute bottom-4 left-[18px] top-4 w-0.5 bg-[#E2E8F0]" />
                    {ruta.etapas.map((e) => {
                      const done = e.estado === "completado";
                      const active = e.estado === "en_curso";
                      return (
                        <li key={e.id} className="relative">
                          <span className={`absolute -left-10 top-1 grid h-9 w-9 place-items-center rounded-2xl text-sm font-black ${
                            done
                              ? "bg-[#34D399] text-white shadow-[0_4px_12px_-2px_rgba(52,211,153,0.4)]"
                              : active
                              ? "bg-[#38BDF8] text-white shadow-[0_4px_12px_-2px_rgba(56,189,248,0.4)] ring-4 ring-[#38BDF8]/20"
                              : "bg-[#CBD5E1] text-white"}`}>
                            {done ? "✓" : e.orden}
                          </span>
                          <div className={`rounded-xl border p-3.5 ${
                            active ? "border-[#38BDF8]/30 bg-[#F0F9FF]"
                            : done ? "border-[#34D399]/20 bg-[#F0FDF4]"
                            : "border-[#E2E8F0] bg-[#F8FAFC]"} ${e.estado === "pendiente" ? "opacity-60" : ""}`}>
                            <p className="text-sm font-bold text-[#1E293B]">{stepWord(e.orden)} · {e.nombre}</p>
                            {e.descripcion && <p className="mt-0.5 text-xs text-[#64748B]">{e.descripcion}</p>}
                            <p className={`mt-1 text-[11px] font-bold ${done ? "text-[#059669]" : active ? "text-[#0284C7]" : "text-[#94A3B8]"}`}>
                              {done ? t.completedLabel : active ? t.currentLabel : t.lockedLabel}
                            </p>
                            {active && (
                              <button onClick={siguiente} disabled={busy}
                                className={`mt-2 w-full ${BTN_PRIMARY} disabled:opacity-50`}>
                                {busy ? "…" : `✓ ${t.completeBtn}`}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            )}

            {/* ── PROGRESO ────────────────────────────────────────────── */}
            {tab === "progreso" && me && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-2xl">
                <Tile big={`${me.score}`} lbl={t.statScore} c="text-[#059669]" />
                <Tile big={`${me.ruta_pct}%`} lbl={t.statRuta} c="text-[#0284C7]" />
                <Tile big={`${me.dias_desde_alta}`} lbl={t.statDays} c="text-sky-500" />
                <Tile big={`${me.etapas_completadas}/${me.etapas_total}`} lbl={t.statStages} c="text-violet-500" />
                <Tile big={`${me.tareas_cerradas}`} lbl={t.statTasks} c="text-[#EA580C]" />
                {journey && <Tile big={`${journey.xp}`} lbl="XP" c="text-fuchsia-500" />}
              </div>
            )}

            {/* ── LOGROS + RANKING ────────────────────────────────────── */}
            {tab === "logros" && (
              <div className="space-y-4 lg:max-w-2xl">
                {journey && (
                  <div className="relative flex items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-[#38BDF8] to-[#7DD3FC] p-4 shadow-[0_4px_16px_-4px_rgba(56,189,248,0.4)]">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/40 bg-white/20 text-lg font-black text-white">{journey.level.n}</span>
                    <div className="flex-1">
                      <p className="text-sm font-extrabold text-white">{t.level} {journey.level.n} · {journey.level.name}</p>
                      <p className="text-xs text-white/80">⭐ {journey.xp} XP · 🔥 {journey.racha} {t.streakDays}</p>
                    </div>
                    <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-black text-white">
                      {journey.achievements.filter((a) => a.unlocked).length}/{journey.achievements.length} 🏅
                    </span>
                  </div>
                )}
                <div className={CARD}>
                  <p className={STITLE}>🏅 {t.achievements}</p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {(journey?.achievements ?? []).map((a) => <Badge key={a.key} emoji={a.icon} name={a.label} unlocked={a.unlocked} />)}
                  </div>
                </div>
                <div className={CARD}>
                  <p className={STITLE}>🏆 {t.ranking}</p>
                  <ul className="space-y-2">
                    {ranking.map((r) => (
                      <li key={r.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.yo ? "border-[#38BDF8]/30 bg-[#F0F9FF]" : "border-[#E2E8F0] bg-[#F8FAFC]"}`}>
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black text-white ${r.pos <= 3 ? `bg-gradient-to-br ${PODIUM[r.pos - 1]}` : "bg-[#CBD5E1]"}`}>
                          {r.pos}
                        </span>
                        <span className="flex-1 truncate text-sm font-semibold text-[#1E293B]">{r.yo ? `${t.you} (${r.nombre}) ⭐` : r.nombre}</span>
                        <span className="text-sm font-black text-[#0284C7]">{r.score}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ── SIMULADOR ───────────────────────────────────────────── */}
            {tab === "simular" && (
              <div className={`${CARD} lg:max-w-2xl`}>
                <p className={STITLE}>🎭 {locale === "en" ? "Sales Simulator" : "Simulador de Ventas"}</p>
                <p className="mb-3 text-xs text-[#64748B]">
                  {locale === "en"
                    ? "Practice with a virtual client. AI plays the prospect — you do the pitch."
                    : "Practicá con un cliente virtual. La IA hace de prospecto — vos vendés."}
                </p>

                {simHistoria.length === 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold text-[#1E293B]">{locale === "en" ? "Choose scenario:" : "Elegí escenario:"}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {[
                        { k: "primera_llamada", ic: "📞", es: "Primera llamada", en: "Cold call" },
                        { k: "objeciones", ic: "🛡️", es: "Manejo de objeciones", en: "Objection handling" },
                        { k: "cierre", ic: "🤝", es: "Cierre de venta", en: "Closing" },
                      ].map((s) => (
                        <button key={s.k} onClick={() => setSimScenario(s.k)}
                          className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                            simScenario === s.k
                              ? "border-[#38BDF8]/50 bg-[#F0F9FF] text-[#0284C7]"
                              : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]"}`}>
                          {s.ic} {locale === "en" ? s.en : s.es}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {simHistoria.length > 0 && (
                  <div className="mb-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    {simHistoria.map((m, i) => (
                      <div key={i} className={`flex ${m.rol === "agente" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                          m.rol === "agente"
                            ? "bg-[#38BDF8]/15 text-[#0284C7]"
                            : "border border-[#E2E8F0] bg-white text-[#1E293B]"}`}>
                          <span className="mr-1.5 text-xs opacity-60">
                            {m.rol === "agente" ? (locale === "en" ? "You" : "Vos") : (locale === "en" ? "Client" : "Cliente")}
                          </span>
                          {m.texto}
                        </div>
                      </div>
                    ))}
                    {simBusy && <p className="text-center text-xs text-[#94A3B8]">…</p>}
                  </div>
                )}

                {simResp?.feedback && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="text-xs font-semibold text-amber-600">💡 {locale === "en" ? "Coach feedback" : "Feedback del coach"}</p>
                    <p className="mt-0.5 text-xs text-[#64748B]">{simResp.feedback}</p>
                  </div>
                )}

                {simResp?.terminado && (
                  <p className="mb-3 rounded-xl border border-[#34D399]/30 bg-[#F0FDF4] px-3 py-2 text-center text-sm font-semibold text-[#059669]">
                    🏁 {locale === "en" ? "Simulation complete! Great practice." : "¡Simulación completada! Buen entrenamiento."}
                  </p>
                )}

                <div className="flex gap-2">
                  {simHistoria.length > 0 && (
                    <button onClick={simReset}
                      className="shrink-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-xs text-[#64748B] hover:bg-[#E2E8F0]">
                      {locale === "en" ? "Reset" : "Reiniciar"}
                    </button>
                  )}
                  <input value={simMsg} onChange={(e) => setSimMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && simEnviar()}
                    disabled={simBusy || !!simResp?.terminado}
                    placeholder={simHistoria.length === 0
                      ? (locale === "en" ? "Start the conversation…" : "Iniciá la conversación…")
                      : (locale === "en" ? "Your response…" : "Tu respuesta…")}
                    className={`${INPUT} disabled:opacity-40`} />
                  <button onClick={simEnviar} disabled={simBusy || !!simResp?.terminado}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#38BDF8] text-white shadow-[0_4px_12px_-2px_rgba(56,189,248,0.4)] disabled:opacity-40">
                    {simBusy ? "…" : "➤"}
                  </button>
                </div>
              </div>
            )}

            {/* ── COACH IA ────────────────────────────────────────────── */}
            {tab === "ayuda" && (
              <div className={`${CARD} lg:max-w-2xl`}>
                <p className={STITLE}>🧠 Coach IA</p>
                <p className="mb-3 text-xs text-[#64748B]">
                  {locale === "en"
                    ? "Ask me about products, objections, sales scripts or AIG policies."
                    : "Preguntame sobre productos, objeciones, guiones de venta o políticas de AIG."}
                </p>
                {resp && (
                  <div className="mb-3 space-y-2">
                    <div className="rounded-xl border border-[#38BDF8]/20 bg-[#F0F9FF] p-3.5 text-sm text-[#1E293B]">{resp.answer}</div>
                    {resp.fuentes.length > 0 && (
                      <p className="text-xs text-[#94A3B8]">📚 {locale === "en" ? "Sources" : "Fuentes"}: {resp.fuentes.join(" · ")}</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={pregunta} onChange={(e) => setPregunta(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && preguntar()}
                    placeholder={locale === "en" ? "How do I handle the price objection?" : "¿Cómo manejo la objeción de precio?"}
                    className={INPUT} />
                  <button onClick={preguntar} disabled={pensando}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#38BDF8] text-white shadow-[0_4px_12px_-2px_rgba(56,189,248,0.4)] disabled:opacity-50">
                    {pensando ? "…" : "➤"}
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* FAB ayuda (mobile) */}
          {tab !== "ayuda" && (
            <button onClick={() => setTab("ayuda")}
              className="fixed bottom-24 right-5 z-30 flex items-center gap-2 rounded-full bg-[#38BDF8] px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_24px_-4px_rgba(56,189,248,0.5)] transition active:scale-95 lg:bottom-6">
              💬 {t.tabAyuda}
            </button>
          )}

          {/* Tab bar (mobile) */}
          <nav className="sticky bottom-0 z-20 mx-3 mb-3 flex rounded-2xl border border-[#E2E8F0] bg-white/90 p-1.5 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden">
            {TABS.map((x) => (
              <button key={x.k} onClick={() => setTab(x.k)}
                className={`flex flex-1 flex-col items-center rounded-xl py-1.5 text-[10px] font-bold transition ${
                  tab === x.k
                    ? "bg-[#38BDF8] text-white shadow-[0_4px_12px_-2px_rgba(56,189,248,0.35)]"
                    : "text-[#94A3B8]"}`}>
                <span className="text-lg leading-none">{x.ic}</span>
                <span className="mt-0.5">{x.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Mini({ ic, n, lbl, bg }: { ic: string; n: number; lbl: string; bg: string }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
      <span className={`grid h-8 w-8 place-items-center rounded-full text-base ${bg}`}>{ic}</span>
      <p className="mt-1.5 text-xl font-black text-[#1E293B]">{n}</p>
      <p className="text-[10px] font-semibold text-[#94A3B8]">{lbl}</p>
    </div>
  );
}

function Tile({ big, lbl, c }: { big: string; lbl: string; c: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),_0_2px_4px_-1px_rgba(0,0,0,0.03)]">
      <p className={`text-3xl font-black ${c}`}>{big}</p>
      <p className="mt-1 text-[11px] font-semibold text-[#94A3B8]">{lbl}</p>
    </div>
  );
}

function Badge({ emoji, name, unlocked }: { emoji: string; name: string; unlocked: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-2xl border p-3 text-center ${unlocked ? "border-amber-200 bg-amber-50" : "border-[#E2E8F0] bg-[#F8FAFC] opacity-50"}`}>
      <span className={`grid h-12 w-12 place-items-center rounded-full text-2xl ${unlocked ? "bg-amber-100" : "bg-[#E2E8F0] grayscale"}`}>{emoji}</span>
      <p className="mt-1.5 text-[11px] font-bold text-[#64748B]">{name}</p>
    </div>
  );
}
