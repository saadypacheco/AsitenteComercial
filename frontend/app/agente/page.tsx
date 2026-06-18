"use client";

// App del agente (Producto ③): gamificada (estilo diseño2). Mobile-first con
// sidebar en desktop. Dos paletas (teal/violeta) intercambiables por el usuario.
import { Fragment, useEffect, useState } from "react";

import { getUser, logout, requireAgent } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { askAi } from "@/lib/queries/executive";
import {
  avanzar, getAgenda, getJourney, getMe, getRanking, getRuta,
  type AgenteMe, type Journey, type Mission, type RankItem, type Ruta, type Sesion,
} from "@/lib/queries/agente";

type Tab = "hoy" | "agenda" | "ruta" | "progreso" | "logros" | "ayuda";
type ThemeKey = "teal" | "violet";

// Paletas (los fragmentos de clase son literales → Tailwind los compila).
const THEMES = {
  teal: {
    page: "from-teal-50 via-emerald-50 to-cyan-50",
    sidebar: "from-[#0c2b33] to-[#0a3a33]",
    hero: "from-teal-500 via-emerald-500 to-green-500", heroSh: "shadow-emerald-500/30",
    btn: "from-teal-500 to-emerald-500", btnSh: "shadow-emerald-500/30",
    soft: "bg-emerald-50", softRing: "ring-emerald-200", text: "text-emerald-600",
  },
  violet: {
    page: "from-indigo-100 via-violet-50 to-sky-50",
    sidebar: "from-[#1e1b4b] to-[#2e1065]",
    hero: "from-indigo-500 via-violet-500 to-fuchsia-500", heroSh: "shadow-violet-500/30",
    btn: "from-indigo-500 to-violet-500", btnSh: "shadow-indigo-500/30",
    soft: "bg-violet-50", softRing: "ring-violet-200", text: "text-violet-600",
  },
};
const PODIUM = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-orange-400 to-amber-600"];

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
  const [theme, setTheme] = useState<ThemeKey>("teal");

  const [pregunta, setPregunta] = useState("");
  const [resp, setResp] = useState<{ answer: string } | null>(null);
  const [pensando, setPensando] = useState(false);

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
    const s = localStorage.getItem("agente-theme");
    if (s === "violet" || s === "teal") setTheme(s);
  }, []);
  useEffect(reload, [locale]);

  function toggleTheme() {
    const nx: ThemeKey = theme === "teal" ? "violet" : "teal";
    setTheme(nx);
    localStorage.setItem("agente-theme", nx);
  }
  const TH = THEMES[theme];

  async function siguiente() {
    setBusy(true);
    await avanzar().catch(() => {});
    reload();
    setBusy(false);
  }
  async function preguntar() {
    if (!pregunta.trim()) return;
    setPensando(true);
    setResp(await askAi(pregunta, locale).catch(() => ({ answer: "—" })));
    setPensando(false);
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
  ];

  const card = "rounded-3xl bg-white p-5 shadow-[0_8px_30px_-12px_rgba(20,120,100,0.2)] ring-1 ring-slate-100";
  const sTitle = "mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800";

  function ZoomBtn({ url }: { url: string | null }) {
    return (
      <a href={url ?? "#"} target="_blank" rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-600 ring-1 ring-sky-200 transition hover:bg-sky-100">
        🎥 {t.joinZoom}
      </a>
    );
  }
  function MissionCard({ m }: { m: Mission }) {
    return (
      <div className={`rounded-2xl p-4 ring-1 ${m.done ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-slate-100"}`}>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl shadow-sm">{m.done ? "✅" : m.icon}</span>
        <p className={`mt-2 text-sm ${m.done ? "text-slate-400" : "font-bold text-slate-700"}`}>{m.label}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-700">+{m.xp} XP</span>
          {m.done ? (
            <span className="text-xs font-bold text-emerald-600">✓ {t.completedLabel}</span>
          ) : (
            <button onClick={() => setTab("ruta")} className={`rounded-full bg-gradient-to-r ${TH.btn} px-3 py-1 text-xs font-bold text-white`}>{t.startBtn}</button>
          )}
        </div>
      </div>
    );
  }
  function Streak() {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-extrabold text-orange-600">
        🔥 {journey?.racha ?? 0} {t.streakDays}
      </span>
    );
  }
  const navBtn = (active: boolean) =>
    `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${active ? `bg-gradient-to-r ${TH.btn} text-white shadow-md ${TH.btnSh}` : "text-white/60 hover:bg-white/10 hover:text-white"}`;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${TH.page}`}>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl">
        {/* ── Sidebar (desktop) ── */}
        <aside className={`hidden w-60 shrink-0 flex-col bg-gradient-to-b ${TH.sidebar} px-4 py-5 text-white lg:flex`}>
          <div className="mb-6 flex items-center gap-2 px-2">
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${TH.hero} text-base`}>🚀</span>
            <span className="text-lg font-black">Execally</span>
          </div>
          <nav className="space-y-1.5">
            {TABS.map((x) => (
              <button key={x.k} onClick={() => setTab(x.k)} className={`w-full ${navBtn(tab === x.k)}`}>
                <span className="text-lg">{x.ic}</span>{x.label}
              </button>
            ))}
            <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-white/30">
              <span className="text-lg">🛍️</span>{t.store} <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[9px]">{t.soon}</span>
            </div>
          </nav>
          {journey && (
            <div className="mt-auto rounded-2xl bg-white/10 p-3">
              <div className="flex items-center gap-2">
                <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${TH.hero} text-sm font-black`}>{journey.level.n}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{nombre || "—"}</p>
                  <p className="text-[11px] text-white/60">{t.level} {journey.level.n} · {journey.level.name}</p>
                </div>
              </div>
              <div className="mt-2"><Streak /></div>
            </div>
          )}
          <button onClick={toggleTheme} className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-white/10 py-2 text-xs font-bold text-white/80 hover:bg-white/15">
            🎨 {t.theme}: {theme === "teal" ? "Teal" : "Violeta"}
          </button>
        </aside>

        {/* ── Main ── */}
        <div className="flex min-h-screen flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 flex items-center gap-3 bg-white/70 px-5 py-3.5 backdrop-blur-xl">
            <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${TH.hero} text-xl shadow-lg ${TH.heroSh} lg:hidden`}>👩‍💼</span>
            <div className="flex-1">
              <h1 className="text-base font-extrabold text-slate-900">{t.hello}, {nombre} 👋</h1>
              <p className="text-xs font-medium text-slate-400">{me?.ciudad}</p>
            </div>
            <span className="hidden sm:block"><Streak /></span>
            <button onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-base transition hover:bg-slate-200 lg:hidden" title={t.theme}>🎨</button>
            <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-400 transition hover:bg-slate-200" title={t.logout}>⎋</button>
          </header>

          <main className="flex-1 px-4 py-4 lg:px-8 lg:py-6">
            {/* ── HOY ── */}
            {tab === "hoy" && (
              <div className="space-y-4 lg:space-y-6">
                {/* Hero nivel + Resumen */}
                <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
                  {journey && (
                    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${TH.hero} p-5 text-white shadow-xl ${TH.heroSh} lg:col-span-2`}>
                      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15" />
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-lg font-black ring-2 ring-white/40 backdrop-blur">{journey.level.n}</span>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">{t.level} {journey.level.n}</p>
                            <p className="text-2xl font-black leading-tight">{journey.level.name}</p>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-amber-300/95 px-3 py-1.5 text-amber-900 shadow-lg">
                          <p className="text-lg font-black leading-none">⭐ {journey.xp}</p>
                          <p className="text-center text-[10px] font-bold">XP</p>
                        </div>
                      </div>
                      {journey.level.next_name ? (
                        <div className="relative mt-4">
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/15">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-200 transition-all duration-700" style={{ width: `${journey.level.pct_to_next}%` }} />
                          </div>
                          <p className="mt-1.5 text-[11px] font-semibold text-white/90">{journey.level.xp_into}/{journey.level.xp_span} XP → {journey.level.next_name}</p>
                        </div>
                      ) : <p className="relative mt-4 text-sm font-bold">🏆 {t.maxLevel}</p>}
                    </div>
                  )}
                  {/* Resumen rápido */}
                  {journey && (
                    <div className={card}>
                      <p className={sTitle}>📊 {t.resumenTitle}</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <Mini ic="📚" n={journey.resumen.etapas} lbl={t.statStages} c="text-emerald-600" />
                        <Mini ic="🎥" n={journey.resumen.zoom} lbl="Zoom" c="text-sky-600" />
                        <Mini ic="💼" n={journey.resumen.ventas} lbl={t.statTasks} c="text-amber-600" />
                        <Mini ic="🏅" n={journey.resumen.logros} lbl={t.tabLogros} c="text-fuchsia-600" />
                      </div>
                      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-500">{t.weekProgress}: <span className={TH.text}>+{journey.resumen.xp_semana} XP</span></p>
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
                            {i > 0 && <span className={`h-1 flex-1 rounded-full ${s.done || s.current ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-slate-200"}`} />}
                            <span title={s.label}
                              className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-base transition ${s.done ? "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-md shadow-emerald-500/30" : s.current ? `scale-110 bg-gradient-to-br ${TH.btn} text-white shadow-lg ${TH.btnSh} ring-4 ${TH.softRing}` : "bg-slate-100 text-slate-300"}`}>
                              {s.done ? "✓" : s.icon}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                      {(() => {
                        const cur = journey.journey.find((s) => s.current);
                        return cur ? (
                          <div className={`mt-4 flex items-center justify-center gap-2 rounded-2xl ${TH.soft} px-3 py-2 text-sm`}>
                            <span className="font-semibold text-slate-500">{t.nowLabel}:</span>
                            <span className={`font-extrabold ${TH.text}`}>{cur.icon} {cur.label}</span>
                          </div>
                        ) : <p className="mt-4 text-center text-sm font-extrabold text-emerald-600">🏆 {t.journeyDone}</p>;
                      })()}
                      {actual && <button onClick={() => setTab("ruta")} className={`mt-3 w-full rounded-2xl bg-gradient-to-r ${TH.btn} py-3 text-sm font-bold text-white shadow-lg ${TH.btnSh} transition active:scale-[0.98]`}>{t.continueBtn} →</button>}
                    </div>
                  )}
                  {/* Próxima misión */}
                  {proxMision && (
                    <div className={`flex flex-col justify-between rounded-3xl bg-gradient-to-br ${TH.hero} p-5 text-white shadow-xl ${TH.heroSh}`}>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">{t.nextMission}</p>
                        <span className="mt-2 inline-block text-3xl">{proxMision.icon}</span>
                        <p className="mt-1 text-lg font-extrabold leading-snug">{proxMision.label}</p>
                        <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-black">+{proxMision.xp} XP</span>
                      </div>
                      <button onClick={() => setTab("ruta")} className="mt-4 w-full rounded-2xl bg-white py-2.5 text-sm font-extrabold text-slate-800 shadow-lg transition active:scale-[0.98]">{t.startMission}</button>
                    </div>
                  )}
                </div>

                {/* Misiones recomendadas */}
                {journey && journey.missions.length > 0 && (
                  <div>
                    <p className={sTitle}>🎯 {t.recommended}</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {journey.missions.map((m, i) => <MissionCard key={i} m={m} />)}
                    </div>
                  </div>
                )}

                {/* Sesiones de hoy */}
                <div className={card}>
                  <p className={sTitle}>📅 {t.todaySessions}</p>
                  <div className="space-y-2.5">
                    {agenda.filter((s) => isToday(s.fecha)).map((s) => (
                      <div key={s.id} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                        <p className="text-sm font-bold text-slate-800">{fmtTime(s.fecha)} · {s.nombre}</p>
                        <p className="text-xs text-slate-400">{s.duracion_min} min</p>
                        <ZoomBtn url={s.zoom_url} />
                      </div>
                    ))}
                    {agenda.filter((s) => isToday(s.fecha)).length === 0 && <p className="text-sm text-slate-400">{t.noSessions}</p>}
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
                    <li key={s.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${TH.hero} text-center text-white shadow-md ${TH.heroSh}`}>
                        <span className="text-[10px] font-bold leading-tight">{fmtDay(s.fecha)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{s.nombre}</p>
                        <p className="text-xs text-slate-400">{fmtTime(s.fecha)} · {s.duracion_min} min</p>
                        <ZoomBtn url={s.zoom_url} />
                      </div>
                    </li>
                  ))}
                  {agenda.length === 0 && <li className="text-sm text-slate-400">{t.noSessions}</li>}
                </ul>
              </div>
            )}

            {/* ── RUTA ── */}
            {tab === "ruta" && ruta && (
              <div className="space-y-4 lg:max-w-2xl">
                <div className={card}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-slate-800">{t.overall}</span>
                    <span className={`text-sm font-black ${TH.text}`}>{ruta.pct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full bg-gradient-to-r ${TH.hero} transition-all duration-700`} style={{ width: `${ruta.pct}%` }} />
                  </div>
                </div>
                <div className={card}>
                  <p className={sTitle}>🎯 {t.rutaTitle}</p>
                  <ol className="relative space-y-3 pl-10">
                    <span className="absolute bottom-4 left-[18px] top-4 w-0.5 bg-slate-200" />
                    {ruta.etapas.map((e) => {
                      const done = e.estado === "completado";
                      const active = e.estado === "en_curso";
                      return (
                        <li key={e.id} className="relative">
                          <span className={`absolute -left-10 top-1 grid h-9 w-9 place-items-center rounded-2xl text-sm font-black ${done ? "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-md shadow-emerald-500/30" : active ? `bg-gradient-to-br ${TH.btn} text-white shadow-lg ${TH.btnSh} ring-4 ${TH.softRing}` : "bg-slate-100 text-slate-300"}`}>
                            {done ? "✓" : e.orden}
                          </span>
                          <div className={`rounded-2xl p-3.5 ring-1 ${active ? `${TH.soft} ${TH.softRing}` : "bg-slate-50 ring-slate-100"} ${e.estado === "pendiente" ? "opacity-60" : ""}`}>
                            <p className="text-sm font-bold text-slate-800">{stepWord(e.orden)} · {e.nombre}</p>
                            {e.descripcion && <p className="mt-0.5 text-xs text-slate-400">{e.descripcion}</p>}
                            <p className={`mt-1 text-[11px] font-bold ${done ? "text-emerald-500" : active ? TH.text : "text-slate-300"}`}>
                              {done ? t.completedLabel : active ? t.currentLabel : t.lockedLabel}
                            </p>
                            {active && <button onClick={siguiente} disabled={busy} className={`mt-2 w-full rounded-2xl bg-gradient-to-r ${TH.btn} py-2.5 text-sm font-bold text-white shadow-md ${TH.btnSh} transition active:scale-[0.98] disabled:opacity-50`}>{busy ? "…" : `✓ ${t.completeBtn}`}</button>}
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
                <Tile big={`${me.score}`} lbl={t.statScore} grad="from-emerald-400 to-emerald-500" />
                <Tile big={`${me.ruta_pct}%`} lbl={t.statRuta} grad="from-teal-500 to-emerald-500" />
                <Tile big={`${me.dias_desde_alta}`} lbl={t.statDays} grad="from-sky-400 to-blue-500" />
                <Tile big={`${me.etapas_completadas}/${me.etapas_total}`} lbl={t.statStages} grad="from-fuchsia-400 to-pink-500" />
                <Tile big={`${me.tareas_cerradas}`} lbl={t.statTasks} grad="from-amber-400 to-orange-500" />
                {journey && <Tile big={`${journey.xp}`} lbl="XP" grad="from-violet-500 to-fuchsia-500" />}
              </div>
            )}

            {/* ── LOGROS + RANKING ── */}
            {tab === "logros" && (
              <div className="space-y-4 lg:max-w-2xl">
                {journey && (
                  <div className={`flex items-center gap-3 rounded-3xl bg-gradient-to-br ${TH.hero} p-4 text-white shadow-lg ${TH.heroSh}`}>
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-lg font-black ring-2 ring-white/40">{journey.level.n}</span>
                    <div className="flex-1">
                      <p className="text-sm font-extrabold">{t.level} {journey.level.n} · {journey.level.name}</p>
                      <p className="text-xs text-white/80">⭐ {journey.xp} XP · 🔥 {journey.racha} {t.streakDays}</p>
                    </div>
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">{journey.achievements.filter((a) => a.unlocked).length}/{journey.achievements.length} 🏅</span>
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
                      <li key={r.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${r.yo ? `${TH.soft} ring-1 ${TH.softRing}` : "bg-slate-50 ring-1 ring-slate-100"}`}>
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-black text-white ${r.pos <= 3 ? `bg-gradient-to-br ${PODIUM[r.pos - 1]}` : "bg-slate-300"}`}>{r.pos}</span>
                        <span className="flex-1 truncate text-sm font-semibold text-slate-700">{r.yo ? `${t.you} (${r.nombre}) ⭐` : r.nombre}</span>
                        <span className="text-sm font-black text-slate-800">{r.score}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ── AYUDA ── */}
            {tab === "ayuda" && (
              <div className={`${card} lg:max-w-2xl`}>
                <p className={sTitle}>💬 {t.helpTitle}</p>
                {resp && <div className={`mb-3 rounded-2xl ${TH.soft} p-3.5 text-sm text-slate-700 ring-1 ${TH.softRing}`}>{resp.answer}</div>}
                <div className="flex gap-2">
                  <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && preguntar()}
                    placeholder={t.helpPlaceholder} className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  <button onClick={preguntar} disabled={pensando} className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${TH.btn} text-white shadow-md ${TH.btnSh} disabled:opacity-50`}>{pensando ? "…" : "➤"}</button>
                </div>
              </div>
            )}
          </main>

          {/* FAB ayuda (mobile) */}
          {tab !== "ayuda" && (
            <button onClick={() => setTab("ayuda")} className="fixed bottom-24 right-5 z-20 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 px-4 py-3 text-sm font-extrabold text-white shadow-xl shadow-emerald-500/40 transition active:scale-95 lg:bottom-6">💬 {t.tabAyuda}</button>
          )}

          {/* Tab bar (mobile) */}
          <nav className="sticky bottom-0 z-10 mx-3 mb-3 flex rounded-3xl bg-white/90 p-1.5 shadow-[0_-4px_30px_-12px_rgba(20,120,100,0.3)] ring-1 ring-slate-100 backdrop-blur-xl lg:hidden">
            {TABS.map((x) => (
              <button key={x.k} onClick={() => setTab(x.k)}
                className={`flex flex-1 flex-col items-center rounded-2xl py-1.5 text-[10px] font-bold transition ${tab === x.k ? `bg-gradient-to-br ${TH.btn} text-white shadow-md ${TH.btnSh}` : "text-slate-400"}`}>
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

function Mini({ ic, n, lbl, c }: { ic: string; n: number; lbl: string; c: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-2.5 ring-1 ring-slate-100">
      <p className="text-base">{ic}</p>
      <p className={`text-xl font-black ${c}`}>{n}</p>
      <p className="text-[10px] font-semibold text-slate-400">{lbl}</p>
    </div>
  );
}

function Tile({ big, lbl, grad }: { big: string; lbl: string; grad: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-[0_8px_30px_-12px_rgba(20,120,100,0.2)] ring-1 ring-slate-100">
      <span className={`inline-block bg-gradient-to-r ${grad} bg-clip-text text-3xl font-black text-transparent`}>{big}</span>
      <p className="mt-1 text-[11px] font-semibold text-slate-400">{lbl}</p>
    </div>
  );
}

function Badge({ emoji, name, unlocked }: { emoji: string; name: string; unlocked: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-2xl p-3 text-center ring-1 ${unlocked ? "bg-gradient-to-br from-amber-50 to-white ring-amber-200" : "bg-slate-50 opacity-50 ring-slate-100"}`}>
      <span className={`grid h-12 w-12 place-items-center rounded-full text-2xl ${unlocked ? "bg-white shadow-md shadow-amber-200" : "bg-slate-100 grayscale"}`}>{emoji}</span>
      <p className="mt-1.5 text-[11px] font-bold text-slate-600">{name}</p>
    </div>
  );
}
