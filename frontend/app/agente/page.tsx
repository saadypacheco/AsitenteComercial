"use client";

// App del agente (Producto ③): tema OSCURO estilo "Empresa" (cyber/glass).
// Fondo #05050f con glows azul/púrpura + grilla cyan, cards glass, acento cyan
// (#00bfff) / púrpura (#8b5cf6) intercambiable. Mobile-first con sidebar en desktop.
import { Fragment, useEffect, useState, type CSSProperties } from "react";

import { getUser, logout, requireAgent } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import {
  askCoach, avanzar, getAgenda, getJourney, getMe, getRanking, getRuta, simChat,
  type AgenteMe, type CoachResp, type Journey, type Mission, type RankItem, type Ruta, type Sesion, type SimMsg,
} from "@/lib/queries/agente";

type Tab = "hoy" | "agenda" | "ruta" | "progreso" | "logros" | "simular" | "ayuda";
type ThemeKey = "cyan" | "purple";

const ACCENT = { cyan: { a: "#00bfff", a2: "#8b5cf6" }, purple: { a: "#8b5cf6", a2: "#00bfff" } };
const PODIUM = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-orange-400 to-amber-600"];
const MISSION_ICONBG = ["bg-cyan-400/15 text-cyan-300", "bg-violet-400/15 text-violet-300", "bg-amber-400/15 text-amber-300", "bg-emerald-400/15 text-emerald-300"];

// Texturas de fondo (glows + grilla cyan) — estilo Empresa.
const AMBIENT: CSSProperties = { backgroundImage: "radial-gradient(ellipse 60% 50% at 18% 0%, rgba(0,140,220,0.22), transparent 60%), radial-gradient(ellipse 50% 40% at 92% 8%, rgba(139,92,246,0.16), transparent 55%)" };
const GRID: CSSProperties = { backgroundImage: "linear-gradient(rgba(0,191,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,191,255,0.045) 1px, transparent 1px)", backgroundSize: "56px 56px" };

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
  const [theme, setTheme] = useState<ThemeKey>("cyan");

  const [pregunta, setPregunta] = useState("");
  const [resp, setResp] = useState<CoachResp | null>(null);
  const [pensando, setPensando] = useState(false);

  // Simulador
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
    const s = localStorage.getItem("agente-accent");
    if (s === "purple" || s === "cyan") setTheme(s);
  }, []);
  useEffect(reload, [locale]);

  function toggleTheme() {
    const nx: ThemeKey = theme === "cyan" ? "purple" : "cyan";
    setTheme(nx);
    localStorage.setItem("agente-accent", nx);
  }
  const accentVars = { "--a": ACCENT[theme].a, "--a2": ACCENT[theme].a2 } as CSSProperties;

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

  // Glass card oscura (estilo Empresa).
  const card = "rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.7)]";
  const sTitle = "mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300";
  const accentGrad = "bg-[linear-gradient(135deg,var(--a),var(--a2))]";

  function ZoomBtn({ url }: { url: string | null }) {
    return (
      <a href={url ?? "#"} target="_blank" rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/20">
        🎥 {t.joinZoom}
      </a>
    );
  }
  function MissionCard({ m, idx }: { m: Mission; idx: number }) {
    return (
      <div className={`rounded-2xl border p-4 ${m.done ? "border-emerald-400/30 bg-emerald-400/[0.07]" : "border-white/[0.07] bg-white/[0.03]"}`}>
        <span className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${m.done ? "bg-emerald-400/15 text-emerald-300" : MISSION_ICONBG[idx % MISSION_ICONBG.length]}`}>{m.done ? "✓" : m.icon}</span>
        <p className={`mt-2 text-sm ${m.done ? "text-slate-500 line-through" : "font-semibold text-slate-100"}`}>{m.label}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-black text-amber-300">+{m.xp} XP</span>
          {m.done ? <span className="text-xs font-bold text-emerald-400">✓ {t.completedLabel}</span>
            : <button onClick={() => setTab("ruta")} className={`rounded-full ${accentGrad} px-3 py-1 text-xs font-bold text-white shadow-[0_0_18px_-4px_var(--a)]`}>{t.startBtn}</button>}
        </div>
      </div>
    );
  }
  function Streak() {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-extrabold text-amber-300">
        🔥 {journey?.racha ?? 0} {t.streakDays}
      </span>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#05050f] text-[#e9edfb]" style={accentVars}>
      <div className="pointer-events-none fixed inset-0 z-0" style={AMBIENT} />
      <div className="pointer-events-none fixed inset-0 z-0" style={GRID} />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl">
        {/* ── Sidebar (desktop) ── */}
        <aside className="relative hidden w-60 shrink-0 flex-col overflow-hidden border-r border-cyan-400/10 px-4 py-5 lg:flex">
          <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-90" style={{ backgroundImage: "url(/imagenes/fondolateral.png)" }} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05060f]/60 via-[#05060f]/30 to-[#05060f]/90" />
          <div className="relative z-10 mb-6 flex items-center gap-2 px-2">
            <span className={`grid h-9 w-9 place-items-center rounded-lg ${accentGrad} text-base shadow-[0_0_20px_-4px_var(--a)]`}>🚀</span>
            <span className="text-lg font-black tracking-tight">Execally</span>
          </div>
          <nav className="relative z-10 space-y-1.5">
            {TABS.map((x) => (
              <button key={x.k} onClick={() => setTab(x.k)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${tab === x.k ? `${accentGrad} text-white shadow-[0_0_22px_-6px_var(--a)]` : "text-slate-300/70 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-lg">{x.ic}</span>{x.label}
              </button>
            ))}
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500">
              <span className="text-lg">🛍️</span>{t.store} <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[9px]">{t.soon}</span>
            </div>
          </nav>
          {journey && (
            <div className="relative z-10 mt-auto rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${accentGrad} text-sm font-black`}>{journey.level.n}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{nombre || "—"}</p>
                  <p className="text-[11px] text-slate-400">{t.level} {journey.level.n} · {journey.level.name}</p>
                </div>
              </div>
              <div className="mt-2"><Streak /></div>
            </div>
          )}
          <button onClick={toggleTheme} className="relative z-10 mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">
            🎨 {t.theme}: {theme === "cyan" ? "Cyan" : "Violeta"}
          </button>
        </aside>

        {/* ── Main ── */}
        <div className="flex min-h-screen flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.06] bg-[#05050f]/70 px-5 py-3.5 backdrop-blur-xl">
            <span className={`grid h-11 w-11 place-items-center rounded-2xl ${accentGrad} text-xl shadow-[0_0_22px_-6px_var(--a)] lg:hidden`}>👩‍💼</span>
            <div className="flex-1">
              <h1 className="text-base font-extrabold">{t.hello}, {nombre} 👋</h1>
              <p className="text-xs font-medium text-slate-400">{me?.ciudad}</p>
            </div>
            <span className="hidden sm:block"><Streak /></span>
            <button onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-base transition hover:bg-white/10 lg:hidden" title={t.theme}>🎨</button>
            <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10" title={t.logout}>⎋</button>
          </header>

          <main className="flex-1 px-4 py-4 lg:px-8 lg:py-6">
            {/* ── HOY ── */}
            {tab === "hoy" && (
              <div className="space-y-4 lg:space-y-6">
                {/* Hero nivel + Resumen */}
                <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
                  {journey && (
                    <div className="relative overflow-hidden rounded-3xl border border-cyan-400/25 p-5 shadow-[0_0_50px_-18px_rgba(0,191,255,0.6)] lg:col-span-2"
                      style={{ background: "linear-gradient(135deg, rgba(0,120,200,0.40) 0%, rgba(20,30,70,0.6) 45%, rgba(139,92,246,0.30) 100%), #0a1230" }}>
                      <span className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-cyan-400/10 blur-2xl" />
                      <span className="pointer-events-none absolute bottom-2 right-4 text-5xl opacity-20">🚀</span>
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/25 bg-white/10 text-lg font-black backdrop-blur">{journey.level.n}</span>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-200/80">{t.level} {journey.level.n}</p>
                            <p className="text-2xl font-black leading-tight">{journey.level.name}</p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-amber-300">
                          <p className="text-lg font-black leading-none">⭐ {journey.xp}</p>
                          <p className="text-center text-[10px] font-bold">XP</p>
                        </div>
                      </div>
                      {journey.level.next_name ? (
                        <div className="relative mt-4">
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/30">
                            <div className="h-full rounded-full bg-[linear-gradient(90deg,#00bfff,#8b5cf6)] shadow-[0_0_14px_-2px_#00bfff] transition-all duration-700" style={{ width: `${journey.level.pct_to_next}%` }} />
                          </div>
                          <p className="mt-1.5 text-[11px] font-semibold text-slate-300">{journey.level.xp_into}/{journey.level.xp_span} XP → {journey.level.next_name}</p>
                        </div>
                      ) : <p className="relative mt-4 text-sm font-bold text-amber-300">🏆 {t.maxLevel}</p>}
                    </div>
                  )}
                  {/* Resumen rápido */}
                  {journey && (
                    <div className={card}>
                      <p className={sTitle}>📊 {t.resumenTitle}</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <Mini ic="📚" n={journey.resumen.etapas} lbl={t.statStages} bg="bg-cyan-400/15 text-cyan-300" />
                        <Mini ic="🎥" n={journey.resumen.zoom} lbl="Zoom" bg="bg-sky-400/15 text-sky-300" />
                        <Mini ic="💼" n={journey.resumen.ventas} lbl={t.statTasks} bg="bg-amber-400/15 text-amber-300" />
                        <Mini ic="🏅" n={journey.resumen.logros} lbl={t.tabLogros} bg="bg-violet-400/15 text-violet-300" />
                      </div>
                      <p className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-center text-xs font-semibold text-slate-400">{t.weekProgress}: <span className="text-cyan-300">+{journey.resumen.xp_semana} XP</span></p>
                    </div>
                  )}
                </div>

                {/* Journey + Próxima misión */}
                <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
                  {journey && (
                    <div className={`${card} lg:col-span-2`}>
                      <p className={sTitle}>🚀 {t.journeyTitle}</p>
                      <div className="flex items-center">
                        {journey.journey.map((s, i) => (
                          <Fragment key={s.key}>
                            {i > 0 && <span className={`h-1 flex-1 rounded-full ${s.done || s.current ? "bg-[linear-gradient(90deg,#10b981,#00bfff)]" : "bg-white/10"}`} />}
                            <span title={s.label}
                              className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-base transition ${s.done ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40" : s.current ? `scale-110 ${accentGrad} text-white shadow-[0_0_22px_-4px_var(--a)] ring-4 ring-cyan-400/20` : "bg-white/5 text-slate-600 ring-1 ring-white/10"}`}>
                              {s.done ? "✓" : s.icon}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                      {(() => {
                        const cur = journey.journey.find((s) => s.current);
                        return cur ? (
                          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm">
                            <span className="font-semibold text-slate-400">{t.nowLabel}:</span>
                            <span className="font-extrabold text-cyan-300">{cur.icon} {cur.label}</span>
                          </div>
                        ) : <p className="mt-4 text-center text-sm font-extrabold text-emerald-400">🏆 {t.journeyDone}</p>;
                      })()}
                      {actual && <button onClick={() => setTab("ruta")} className={`mt-3 w-full rounded-xl ${accentGrad} py-3 text-sm font-bold text-white shadow-[0_0_26px_-6px_var(--a)] transition active:scale-[0.98]`}>{t.continueBtn} →</button>}
                    </div>
                  )}
                  {/* Próxima misión */}
                  {proxMision && (
                    <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-cyan-400/25 p-5 shadow-[0_0_40px_-16px_rgba(0,191,255,0.5)]"
                      style={{ background: "linear-gradient(135deg, rgba(0,140,210,0.30), rgba(139,92,246,0.22)), #0a1230" }}>
                      <span className="pointer-events-none absolute -bottom-4 -right-3 text-6xl opacity-15">🎯</span>
                      <div className="relative">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-200/80">{t.nextMission}</p>
                        <span className="mt-2 inline-block text-3xl">{proxMision.icon}</span>
                        <p className="mt-1 text-lg font-extrabold leading-snug">{proxMision.label}</p>
                        <span className="mt-2 inline-block rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-black text-amber-300">+{proxMision.xp} XP</span>
                      </div>
                      <button onClick={() => setTab("ruta")} className={`relative mt-4 w-full rounded-xl ${accentGrad} py-2.5 text-sm font-extrabold text-white shadow-[0_0_24px_-6px_var(--a)] transition active:scale-[0.98]`}>{t.startMission}</button>
                    </div>
                  )}
                </div>

                {/* Misiones recomendadas */}
                {journey && journey.missions.length > 0 && (
                  <div>
                    <p className={sTitle}>🎯 {t.recommended}</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {journey.missions.map((m, i) => <MissionCard key={i} m={m} idx={i} />)}
                    </div>
                  </div>
                )}

                {/* Sesiones de hoy */}
                <div className={card}>
                  <p className={sTitle}>📅 {t.todaySessions}</p>
                  <div className="space-y-2.5">
                    {agenda.filter((s) => isToday(s.fecha)).map((s) => (
                      <div key={s.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                        <p className="text-sm font-bold">{fmtTime(s.fecha)} · {s.nombre}</p>
                        <p className="text-xs text-slate-400">{s.duracion_min} min</p>
                        <ZoomBtn url={s.zoom_url} />
                      </div>
                    ))}
                    {agenda.filter((s) => isToday(s.fecha)).length === 0 && <p className="text-sm text-slate-500">{t.noSessions}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── AGENDA ── */}
            {tab === "agenda" && (
              <div className={`${card} lg:max-w-2xl`}>
                <p className={sTitle}>📅 {t.upcoming}</p>
                <ul className="space-y-2.5">
                  {agenda.map((s) => (
                    <li key={s.id} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accentGrad} text-center text-white shadow-[0_0_20px_-6px_var(--a)]`}>
                        <span className="text-[10px] font-bold leading-tight">{fmtDay(s.fecha)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{s.nombre}</p>
                        <p className="text-xs text-slate-400">{fmtTime(s.fecha)} · {s.duracion_min} min</p>
                        <ZoomBtn url={s.zoom_url} />
                      </div>
                    </li>
                  ))}
                  {agenda.length === 0 && <li className="text-sm text-slate-500">{t.noSessions}</li>}
                </ul>
              </div>
            )}

            {/* ── RUTA ── */}
            {tab === "ruta" && ruta && (
              <div className="space-y-4 lg:max-w-2xl">
                <div className={card}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-extrabold">{t.overall}</span>
                    <span className="text-sm font-black text-cyan-300">{ruta.pct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#00bfff,#8b5cf6)] shadow-[0_0_14px_-2px_#00bfff] transition-all duration-700" style={{ width: `${ruta.pct}%` }} />
                  </div>
                </div>
                <div className={card}>
                  <p className={sTitle}>🎯 {t.rutaTitle}</p>
                  <ol className="relative space-y-3 pl-10">
                    <span className="absolute bottom-4 left-[18px] top-4 w-0.5 bg-white/10" />
                    {ruta.etapas.map((e) => {
                      const done = e.estado === "completado";
                      const active = e.estado === "en_curso";
                      return (
                        <li key={e.id} className="relative">
                          <span className={`absolute -left-10 top-1 grid h-9 w-9 place-items-center rounded-2xl text-sm font-black ${done ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40" : active ? `${accentGrad} text-white shadow-[0_0_22px_-4px_var(--a)] ring-4 ring-cyan-400/20` : "bg-white/5 text-slate-600 ring-1 ring-white/10"}`}>
                            {done ? "✓" : e.orden}
                          </span>
                          <div className={`rounded-xl border p-3.5 ${active ? "border-cyan-400/30 bg-cyan-400/[0.06]" : "border-white/[0.06] bg-white/[0.03]"} ${e.estado === "pendiente" ? "opacity-50" : ""}`}>
                            <p className="text-sm font-bold">{stepWord(e.orden)} · {e.nombre}</p>
                            {e.descripcion && <p className="mt-0.5 text-xs text-slate-400">{e.descripcion}</p>}
                            <p className={`mt-1 text-[11px] font-bold ${done ? "text-emerald-400" : active ? "text-cyan-300" : "text-slate-600"}`}>
                              {done ? t.completedLabel : active ? t.currentLabel : t.lockedLabel}
                            </p>
                            {active && <button onClick={siguiente} disabled={busy} className={`mt-2 w-full rounded-xl ${accentGrad} py-2.5 text-sm font-bold text-white shadow-[0_0_22px_-6px_var(--a)] transition active:scale-[0.98] disabled:opacity-50`}>{busy ? "…" : `✓ ${t.completeBtn}`}</button>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            )}

            {/* ── PROGRESO ── */}
            {tab === "progreso" && me && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-2xl">
                <Tile big={`${me.score}`} lbl={t.statScore} c="text-emerald-300" />
                <Tile big={`${me.ruta_pct}%`} lbl={t.statRuta} c="text-cyan-300" />
                <Tile big={`${me.dias_desde_alta}`} lbl={t.statDays} c="text-sky-300" />
                <Tile big={`${me.etapas_completadas}/${me.etapas_total}`} lbl={t.statStages} c="text-violet-300" />
                <Tile big={`${me.tareas_cerradas}`} lbl={t.statTasks} c="text-amber-300" />
                {journey && <Tile big={`${journey.xp}`} lbl="XP" c="text-fuchsia-300" />}
              </div>
            )}

            {/* ── LOGROS + RANKING ── */}
            {tab === "logros" && (
              <div className="space-y-4 lg:max-w-2xl">
                {journey && (
                  <div className="relative flex items-center gap-3 overflow-hidden rounded-3xl border border-cyan-400/25 p-4 shadow-[0_0_40px_-16px_rgba(0,191,255,0.5)]"
                    style={{ background: "linear-gradient(135deg, rgba(0,120,200,0.35), rgba(139,92,246,0.25)), #0a1230" }}>
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/25 bg-white/10 text-lg font-black">{journey.level.n}</span>
                    <div className="flex-1">
                      <p className="text-sm font-extrabold">{t.level} {journey.level.n} · {journey.level.name}</p>
                      <p className="text-xs text-slate-300">⭐ {journey.xp} XP · 🔥 {journey.racha} {t.streakDays}</p>
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black">{journey.achievements.filter((a) => a.unlocked).length}/{journey.achievements.length} 🏅</span>
                  </div>
                )}
                <div className={card}>
                  <p className={sTitle}>🏅 {t.achievements}</p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {(journey?.achievements ?? []).map((a) => <Badge key={a.key} emoji={a.icon} name={a.label} unlocked={a.unlocked} />)}
                  </div>
                </div>
                <div className={card}>
                  <p className={sTitle}>🏆 {t.ranking}</p>
                  <ul className="space-y-2">
                    {ranking.map((r) => (
                      <li key={r.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.yo ? "border-cyan-400/30 bg-cyan-400/[0.07]" : "border-white/[0.06] bg-white/[0.03]"}`}>
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black text-white ${r.pos <= 3 ? `bg-gradient-to-br ${PODIUM[r.pos - 1]}` : "bg-white/10 text-slate-300"}`}>{r.pos}</span>
                        <span className="flex-1 truncate text-sm font-semibold text-slate-100">{r.yo ? `${t.you} (${r.nombre}) ⭐` : r.nombre}</span>
                        <span className="text-sm font-black text-cyan-300">{r.score}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ── SIMULADOR COMERCIAL IA ── */}
            {tab === "simular" && (
              <div className={`${card} lg:max-w-2xl`}>
                <p className={sTitle}>🎭 {locale === "en" ? "Sales Simulator" : "Simulador de Ventas"}</p>
                <p className="mb-3 text-xs text-slate-400">
                  {locale === "en" ? "Practice with a virtual client. AI plays the prospect — you do the pitch." : "Practicá con un cliente virtual. La IA hace de prospecto — vos vendés."}
                </p>

                {simHistoria.length === 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold text-slate-300">{locale === "en" ? "Choose scenario:" : "Elegí escenario:"}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {[
                        { k: "primera_llamada", ic: "📞", es: "Primera llamada", en: "Cold call" },
                        { k: "objeciones", ic: "🛡️", es: "Manejo de objeciones", en: "Objection handling" },
                        { k: "cierre", ic: "🤝", es: "Cierre de venta", en: "Closing" },
                      ].map((s) => (
                        <button key={s.k} onClick={() => setSimScenario(s.k)}
                          className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${simScenario === s.k ? "border-cyan-400/50 bg-cyan-400/[0.12] text-cyan-300" : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"}`}>
                          {s.ic} {locale === "en" ? s.en : s.es}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {simHistoria.length > 0 && (
                  <div className="mb-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    {simHistoria.map((m, i) => (
                      <div key={i} className={`flex ${m.rol === "agente" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.rol === "agente" ? "bg-cyan-400/[0.15] text-cyan-100" : "border border-white/[0.08] bg-white/[0.05] text-slate-200"}`}>
                          <span className="mr-1.5 text-xs opacity-60">{m.rol === "agente" ? (locale === "en" ? "You" : "Vos") : (locale === "en" ? "Client" : "Cliente")}</span>
                          {m.texto}
                        </div>
                      </div>
                    ))}
                    {simBusy && <p className="text-center text-xs text-slate-500">…</p>}
                  </div>
                )}

                {simResp?.feedback && (
                  <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5">
                    <p className="text-xs font-semibold text-amber-300">💡 {locale === "en" ? "Coach feedback" : "Feedback del coach"}</p>
                    <p className="mt-0.5 text-xs text-slate-300">{simResp.feedback}</p>
                  </div>
                )}

                {simResp?.terminado && (
                  <p className="mb-3 rounded-xl bg-ok/10 px-3 py-2 text-center text-sm font-semibold text-ok">
                    🏁 {locale === "en" ? "Simulation complete! Great practice." : "¡Simulación completada! Buen entrenamiento."}
                  </p>
                )}

                <div className="flex gap-2">
                  {simHistoria.length > 0 && (
                    <button onClick={simReset} className="shrink-0 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-slate-400 hover:bg-white/[0.06]">
                      {locale === "en" ? "Reset" : "Reiniciar"}
                    </button>
                  )}
                  <input value={simMsg} onChange={(e) => setSimMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && simEnviar()}
                    disabled={simBusy || !!simResp?.terminado}
                    placeholder={simHistoria.length === 0 ? (locale === "en" ? "Start the conversation…" : "Iniciá la conversación…") : (locale === "en" ? "Your response…" : "Tu respuesta…")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none disabled:opacity-40" />
                  <button onClick={simEnviar} disabled={simBusy || !!simResp?.terminado}
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accentGrad} text-white shadow-[0_0_22px_-6px_var(--a)] disabled:opacity-40`}>
                    {simBusy ? "…" : "➤"}
                  </button>
                </div>
              </div>
            )}

            {/* ── AYUDA / COACH IA ── */}
            {tab === "ayuda" && (
              <div className={`${card} lg:max-w-2xl`}>
                <p className={sTitle}>🧠 Coach IA</p>
                <p className="mb-3 text-xs text-slate-400">
                  {locale === "en" ? "Ask me about products, objections, sales scripts or AIG policies." : "Preguntame sobre productos, objeciones, guiones de venta o políticas de AIG."}
                </p>
                {resp && (
                  <div className="mb-3 space-y-2">
                    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3.5 text-sm text-slate-200">{resp.answer}</div>
                    {resp.fuentes.length > 0 && (
                      <p className="text-xs text-slate-500">📚 {locale === "en" ? "Sources" : "Fuentes"}: {resp.fuentes.join(" · ")}</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && preguntar()}
                    placeholder={locale === "en" ? "How do I handle the price objection?" : "¿Cómo manejo la objeción de precio?"}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none" />
                  <button onClick={preguntar} disabled={pensando} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accentGrad} text-white shadow-[0_0_22px_-6px_var(--a)] disabled:opacity-50`}>{pensando ? "…" : "➤"}</button>
                </div>
              </div>
            )}
          </main>

          {/* FAB ayuda (mobile) */}
          {tab !== "ayuda" && (
            <button onClick={() => setTab("ayuda")} className={`fixed bottom-24 right-5 z-30 flex items-center gap-2 rounded-full ${accentGrad} px-4 py-3 text-sm font-extrabold text-white shadow-[0_0_30px_-6px_var(--a)] transition active:scale-95 lg:bottom-6`}>💬 {t.tabAyuda}</button>
          )}

          {/* Tab bar (mobile) */}
          <nav className="sticky bottom-0 z-20 mx-3 mb-3 flex rounded-2xl border border-white/[0.08] bg-[#0a0c18]/90 p-1.5 backdrop-blur-xl lg:hidden">
            {TABS.map((x) => (
              <button key={x.k} onClick={() => setTab(x.k)}
                className={`flex flex-1 flex-col items-center rounded-xl py-1.5 text-[10px] font-bold transition ${tab === x.k ? `${accentGrad} text-white shadow-[0_0_20px_-6px_var(--a)]` : "text-slate-500"}`}>
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

function Mini({ ic, n, lbl, bg }: { ic: string; n: number; lbl: string; bg: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5">
      <span className={`grid h-8 w-8 place-items-center rounded-full text-base ${bg}`}>{ic}</span>
      <p className="mt-1.5 text-xl font-black">{n}</p>
      <p className="text-[10px] font-semibold text-slate-500">{lbl}</p>
    </div>
  );
}

function Tile({ big, lbl, c }: { big: string; lbl: string; c: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-xl">
      <p className={`text-3xl font-black ${c}`}>{big}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-500">{lbl}</p>
    </div>
  );
}

function Badge({ emoji, name, unlocked }: { emoji: string; name: string; unlocked: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-2xl border p-3 text-center ${unlocked ? "border-amber-400/30 bg-amber-400/[0.06]" : "border-white/[0.06] bg-white/[0.02] opacity-50"}`}>
      <span className={`grid h-12 w-12 place-items-center rounded-full text-2xl ${unlocked ? "bg-amber-400/15" : "bg-white/5 grayscale"}`}>{emoji}</span>
      <p className="mt-1.5 text-[11px] font-bold text-slate-300">{name}</p>
    </div>
  );
}
