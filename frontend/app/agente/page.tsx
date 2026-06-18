"use client";

// App del agente (Producto ③): Hoy, Agenda (Zoom), Ruta, Progreso, Logros + Ayuda.
// Mobile-first, gamificado (estilo Duolingo/kuest): colorido, redondeado, suave.
import { Fragment, useEffect, useState } from "react";

import { getUser, logout, requireAgent } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { askAi } from "@/lib/queries/executive";
import {
  avanzar, getAgenda, getJourney, getMe, getRanking, getRuta,
  type AgenteMe, type Journey, type RankItem, type Ruta, type Sesion,
} from "@/lib/queries/agente";

type Tab = "hoy" | "agenda" | "ruta" | "progreso" | "logros" | "ayuda";

// Paleta de podio para el ranking (estilo mockups).
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
  useEffect(() => { requireAgent(); setNombre(getUser()?.nombre ?? ""); }, []);
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
    setResp(await askAi(pregunta, locale).catch(() => ({ answer: "—" })));
    setPensando(false);
  }

  const actual = ruta?.etapas.find((e) => e.estado === "en_curso");
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

  function ZoomBtn({ url }: { url: string | null }) {
    return (
      <a href={url ?? "#"} target="_blank" rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-600 ring-1 ring-sky-200 transition hover:bg-sky-100">
        🎥 {t.joinZoom}
      </a>
    );
  }

  const card = "rounded-3xl bg-white p-5 shadow-[0_8px_30px_-12px_rgba(99,102,241,0.25)] ring-1 ring-slate-100";
  const sectionTitle = "mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800";

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 via-violet-50 to-sky-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-white/70 px-5 py-3.5 backdrop-blur-xl">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl shadow-lg shadow-indigo-500/30">👩‍💼</span>
          <div className="flex-1">
            <h1 className="text-base font-extrabold text-slate-900">{t.hello}, {nombre} 👋</h1>
            <p className="text-xs font-medium text-slate-400">{me?.ciudad}</p>
          </div>
          <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-400 transition hover:bg-slate-200" title={t.logout}>⎋</button>
        </header>

        {/* Nivel + XP (hero gamificado) */}
        {journey && (
          <div className="relative mx-5 mt-3 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-5 text-white shadow-xl shadow-violet-500/30">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15" />
            <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/10" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-lg font-black ring-2 ring-white/40 backdrop-blur">{journey.level.n}</span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">{t.level} {journey.level.n}</p>
                  <p className="text-xl font-black leading-tight">{journey.level.name}</p>
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
            ) : (
              <p className="relative mt-4 text-sm font-bold">🏆 {t.maxLevel}</p>
            )}
          </div>
        )}

        <div className="flex-1 px-5 pb-4 pt-4">
          {/* ── HOY ── */}
          {tab === "hoy" && (
            <div className="space-y-4">
              {/* Journey hacia la primera venta */}
              {journey && (
                <div className={card}>
                  <p className={sectionTitle}>🚀 {t.journeyTitle}</p>
                  <div className="flex items-center">
                    {journey.journey.map((s, i) => (
                      <Fragment key={s.key}>
                        {i > 0 && <span className={`h-1 flex-1 rounded-full ${s.done || s.current ? "bg-gradient-to-r from-emerald-400 to-indigo-400" : "bg-slate-200"}`} />}
                        <span title={s.label}
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-base transition ${
                            s.done ? "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-md shadow-emerald-500/30"
                            : s.current ? "scale-110 bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-violet-500/40 ring-4 ring-violet-200"
                            : "bg-slate-100 text-slate-300"}`}>
                          {s.done ? "✓" : s.icon}
                        </span>
                      </Fragment>
                    ))}
                  </div>
                  {(() => {
                    const cur = journey.journey.find((s) => s.current);
                    return cur ? (
                      <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-violet-50 px-3 py-2 text-sm">
                        <span className="font-semibold text-slate-500">{t.nowLabel}:</span>
                        <span className="font-extrabold text-violet-600">{cur.icon} {cur.label}</span>
                      </div>
                    ) : (
                      <p className="mt-4 text-center text-sm font-extrabold text-emerald-600">🏆 {t.journeyDone}</p>
                    );
                  })()}
                  {actual && (
                    <button onClick={() => setTab("ruta")} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition active:scale-[0.98]">{t.continueBtn} →</button>
                  )}
                </div>
              )}

              {/* Misiones */}
              {journey && journey.missions.length > 0 && (
                <div className={card}>
                  <p className={sectionTitle}>🎯 {t.missionsTitle}</p>
                  <ul className="space-y-2.5">
                    {journey.missions.map((m, i) => (
                      <li key={i} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${m.done ? "bg-emerald-50 ring-emerald-200" : "bg-slate-50 ring-slate-100"}`}>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-lg shadow-sm">{m.done ? "✅" : m.icon}</span>
                        <span className={`flex-1 text-sm ${m.done ? "text-slate-400 line-through" : "font-semibold text-slate-700"}`}>{m.label}</span>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-700">+{m.xp} XP</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sesiones de hoy */}
              <div className={card}>
                <p className={sectionTitle}>📅 {t.todaySessions}</p>
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
            <div className={card}>
              <p className={sectionTitle}>📅 {t.upcoming}</p>
              <ul className="space-y-2.5">
                {agenda.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-center text-white shadow-md shadow-indigo-500/30">
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
            <div className="space-y-4">
              <div className={card}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-800">{t.overall}</span>
                  <span className="text-sm font-black text-violet-600">{ruta.pct}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-700" style={{ width: `${ruta.pct}%` }} />
                </div>
              </div>
              <div className={card}>
                <p className={sectionTitle}>🎯 {t.rutaTitle}</p>
                <ol className="relative space-y-3 pl-10">
                  <span className="absolute bottom-4 left-[18px] top-4 w-0.5 bg-slate-200" />
                  {ruta.etapas.map((e) => {
                    const done = e.estado === "completado";
                    const active = e.estado === "en_curso";
                    return (
                      <li key={e.id} className="relative">
                        <span className={`absolute -left-10 top-1 grid h-9 w-9 place-items-center rounded-2xl text-sm font-black ${done ? "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-md shadow-emerald-500/30" : active ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-violet-500/40 ring-4 ring-violet-200" : "bg-slate-100 text-slate-300"}`}>
                          {done ? "✓" : e.orden}
                        </span>
                        <div className={`rounded-2xl p-3.5 ring-1 ${active ? "bg-violet-50 ring-violet-200" : "bg-slate-50 ring-slate-100"} ${e.estado === "pendiente" ? "opacity-60" : ""}`}>
                          <p className="text-sm font-bold text-slate-800">{stepWord(e.orden)} · {e.nombre}</p>
                          {e.descripcion && <p className="mt-0.5 text-xs text-slate-400">{e.descripcion}</p>}
                          <p className={`mt-1 text-[11px] font-bold ${done ? "text-emerald-500" : active ? "text-violet-600" : "text-slate-300"}`}>
                            {done ? t.completedLabel : active ? t.currentLabel : t.lockedLabel}
                          </p>
                          {active && (
                            <button onClick={siguiente} disabled={busy} className="mt-2 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/30 transition active:scale-[0.98] disabled:opacity-50">
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

          {/* ── PROGRESO ── */}
          {tab === "progreso" && me && (
            <div className="grid grid-cols-2 gap-3">
              <Tile big={`${me.score}`} lbl={t.statScore} grad="from-emerald-400 to-emerald-500" />
              <Tile big={`${me.ruta_pct}%`} lbl={t.statRuta} grad="from-indigo-500 to-violet-500" />
              <Tile big={`${me.dias_desde_alta}`} lbl={t.statDays} grad="from-sky-400 to-blue-500" />
              <Tile big={`${me.etapas_completadas}/${me.etapas_total}`} lbl={t.statStages} grad="from-fuchsia-400 to-pink-500" />
              <Tile big={`${me.tareas_cerradas}`} lbl={t.statTasks} grad="from-amber-400 to-orange-500" />
              {journey && <Tile big={`${journey.xp}`} lbl="XP" grad="from-violet-500 to-fuchsia-500" />}
            </div>
          )}

          {/* ── LOGROS + RANKING ── */}
          {tab === "logros" && (
            <div className="space-y-4">
              {journey && (
                <div className="flex items-center gap-3 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-500 p-4 text-white shadow-lg shadow-violet-500/30">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-lg font-black ring-2 ring-white/40">{journey.level.n}</span>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold">{t.level} {journey.level.n} · {journey.level.name}</p>
                    <p className="text-xs text-white/80">⭐ {journey.xp} XP</p>
                  </div>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">{journey.achievements.filter((a) => a.unlocked).length}/{journey.achievements.length} 🏅</span>
                </div>
              )}
              <div className={card}>
                <p className={sectionTitle}>🏅 {t.achievements}</p>
                <div className="grid grid-cols-3 gap-3">
                  {(journey?.achievements ?? []).map((a) => (
                    <Badge key={a.key} emoji={a.icon} name={a.label} unlocked={a.unlocked} />
                  ))}
                </div>
              </div>
              <div className={card}>
                <p className={sectionTitle}>🏆 {t.ranking}</p>
                <ul className="space-y-2">
                  {ranking.map((r) => (
                    <li key={r.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${r.yo ? "bg-violet-50 ring-1 ring-violet-200" : "bg-slate-50 ring-1 ring-slate-100"}`}>
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
            <div className={card}>
              <p className={sectionTitle}>💬 {t.helpTitle}</p>
              {resp && <div className="mb-3 rounded-2xl bg-violet-50 p-3.5 text-sm text-slate-700 ring-1 ring-violet-100">{resp.answer}</div>}
              <div className="flex gap-2">
                <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && preguntar()}
                  placeholder={t.helpPlaceholder} className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                <button onClick={preguntar} disabled={pensando} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30 disabled:opacity-50">{pensando ? "…" : "➤"}</button>
              </div>
            </div>
          )}
        </div>

        {/* FAB ayuda */}
        {tab !== "ayuda" && (
          <button onClick={() => setTab("ayuda")} className="fixed bottom-24 right-5 z-20 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 px-4 py-3 text-sm font-extrabold text-white shadow-xl shadow-emerald-500/40 transition active:scale-95">💬 {t.tabAyuda}</button>
        )}

        {/* Tab bar */}
        <nav className="sticky bottom-0 z-10 mx-3 mb-3 flex rounded-3xl bg-white/90 p-1.5 shadow-[0_-4px_30px_-12px_rgba(99,102,241,0.3)] ring-1 ring-slate-100 backdrop-blur-xl">
          {TABS.map((x) => (
            <button key={x.k} onClick={() => setTab(x.k)}
              className={`flex flex-1 flex-col items-center rounded-2xl py-1.5 text-[10px] font-bold transition ${tab === x.k ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30" : "text-slate-400"}`}>
              <span className="text-lg leading-none">{x.ic}</span>
              <span className="mt-0.5">{x.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Tile({ big, lbl, grad }: { big: string; lbl: string; grad: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-[0_8px_30px_-12px_rgba(99,102,241,0.25)] ring-1 ring-slate-100">
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
