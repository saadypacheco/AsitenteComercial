"use client";

// App del agente (Producto ③): Hoy, Agenda (Zoom), Ruta, Progreso, Logros + Ayuda.
// Mobile-first con tab bar inferior. Datos reales (etapas, sesiones, ranking).
import { Fragment, useEffect, useState } from "react";

import { getUser, logout, requireAgent } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { askAi } from "@/lib/queries/executive";
import {
  avanzar, getAgenda, getJourney, getMe, getRanking, getRuta,
  type AgenteMe, type Journey, type RankItem, type Ruta, type Sesion,
} from "@/lib/queries/agente";

type Tab = "hoy" | "agenda" | "ruta" | "progreso" | "logros" | "ayuda";

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
        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[#2d8cff] px-3 py-1.5 text-xs font-semibold text-[#1f7ae0] hover:bg-blue-50">
        🔗 {t.joinZoom}
      </a>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#f7f8fb]">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xl">👩‍💼</span>
        <div className="flex-1">
          <h1 className="text-base font-bold text-ink">{t.hello}, {nombre} 👋</h1>
          <p className="text-xs text-muted">{me?.ciudad}</p>
        </div>
        <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-muted" title={t.logout}>⎋</button>
      </header>

      {/* Nivel + XP (gamificado) */}
      {journey && (
        <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-brand to-brand-2 p-4 text-white shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">{t.level} {journey.level.n}</p>
              <p className="text-xl font-extrabold">{journey.level.name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold leading-none">⭐ {journey.xp}</p>
              <p className="text-xs opacity-80">XP</p>
            </div>
          </div>
          {journey.level.next_name ? (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${journey.level.pct_to_next}%` }} />
              </div>
              <p className="mt-1 text-[11px] opacity-90">{journey.level.xp_into}/{journey.level.xp_span} XP → {journey.level.next_name}</p>
            </div>
          ) : (
            <p className="mt-3 text-[11px] opacity-90">🏆 {t.maxLevel}</p>
          )}
        </div>
      )}

      <div className="flex-1 px-4 py-4">
        {/* ── HOY ── */}
        {tab === "hoy" && (
          <div className="space-y-4">
            {/* Journey hacia la primera venta */}
            {journey && (
              <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">🚀 {t.journeyTitle}</p>
                <div className="flex items-center">
                  {journey.journey.map((s, i) => (
                    <Fragment key={s.key}>
                      {i > 0 && <span className={`h-0.5 flex-1 ${s.done || s.current ? "bg-brand" : "bg-line"}`} />}
                      <span title={s.label}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-base ${s.done ? "bg-ok text-white" : s.current ? "bg-gradient-to-br from-brand to-brand-2 text-white ring-4 ring-brand/20" : "bg-soft text-faint"}`}>
                        {s.done ? "✓" : s.icon}
                      </span>
                    </Fragment>
                  ))}
                </div>
                {(() => {
                  const cur = journey.journey.find((s) => s.current);
                  return cur ? (
                    <p className="mt-3 text-center text-sm"><span className="text-muted">{t.nowLabel}: </span><span className="font-bold text-brand">{cur.icon} {cur.label}</span></p>
                  ) : (
                    <p className="mt-3 text-center text-sm font-bold text-ok">🏆 {t.journeyDone}</p>
                  );
                })()}
                {actual && (
                  <button onClick={() => setTab("ruta")} className="mt-3 w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white">{t.continueBtn}</button>
                )}
              </div>
            )}

            {/* Misiones */}
            {journey && journey.missions.length > 0 && (
              <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-warning">🎯 {t.missionsTitle}</p>
                <ul className="space-y-2">
                  {journey.missions.map((m, i) => (
                    <li key={i} className={`flex items-center gap-3 rounded-xl border p-2.5 ${m.done ? "border-ok/40 bg-[#f3fdf7]" : "border-line"}`}>
                      <span className="text-xl">{m.done ? "✅" : m.icon}</span>
                      <span className={`flex-1 text-sm ${m.done ? "text-muted line-through" : "font-medium text-ink"}`}>{m.label}</span>
                      <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">+{m.xp} XP</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sesiones de hoy */}
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-warning">📅 {t.todaySessions}</h2>
              {agenda.filter((s) => isToday(s.fecha)).map((s) => (
                <div key={s.id} className="mb-2 rounded-xl border border-line bg-white p-3 shadow-card">
                  <p className="text-sm font-semibold text-ink">{fmtTime(s.fecha)} · {s.nombre}</p>
                  <p className="text-xs text-muted">{s.duracion_min} min</p>
                  <ZoomBtn url={s.zoom_url} />
                </div>
              ))}
              {agenda.filter((s) => isToday(s.fecha)).length === 0 && <p className="text-sm text-muted">—</p>}
            </div>
          </div>
        )}

        {/* ── AGENDA ── */}
        {tab === "agenda" && (
          <>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">📅 {t.upcoming}</h2>
            <ul className="space-y-2">
              {agenda.map((s) => (
                <li key={s.id} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3 shadow-card">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-center">
                    <span className="text-[10px] font-bold leading-tight text-brand">{fmtDay(s.fecha)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{s.nombre}</p>
                    <p className="text-xs text-muted">{fmtTime(s.fecha)} · {s.duracion_min} min</p>
                    <ZoomBtn url={s.zoom_url} />
                  </div>
                </li>
              ))}
              {agenda.length === 0 && <li className="text-sm text-muted">{t.noSessions}</li>}
            </ul>
          </>
        )}

        {/* ── RUTA ── */}
        {tab === "ruta" && ruta && (
          <>
            <div className="mb-4 rounded-2xl border border-line bg-white p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-ink">{t.overall}</span>
                <span className="text-sm font-bold text-brand">{ruta.pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-soft">
                <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-all duration-500" style={{ width: `${ruta.pct}%` }} />
              </div>
            </div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">🎯 {t.rutaTitle}</h2>
            <ol className="relative space-y-3 pl-9">
              <span className="absolute bottom-3 left-[14px] top-3 w-0.5 bg-line" />
              {ruta.etapas.map((e) => {
                const done = e.estado === "completado";
                const active = e.estado === "en_curso";
                return (
                  <li key={e.id} className="relative">
                    <span className={`absolute -left-9 top-1 grid h-8 w-8 place-items-center rounded-full border-2 text-sm font-bold ${done ? "border-ok bg-ok text-white" : active ? "border-brand bg-gradient-to-br from-brand to-brand-2 text-white" : "border-line bg-white text-faint"}`}>
                      {done ? "✓" : e.orden}
                    </span>
                    <div className={`rounded-xl border bg-white p-3 shadow-card ${active ? "border-brand ring-1 ring-brand" : "border-line"} ${e.estado === "pendiente" ? "opacity-60" : ""}`}>
                      <p className="text-sm font-bold text-ink">{stepWord(e.orden)} · {e.nombre}</p>
                      {e.descripcion && <p className="mt-0.5 text-xs text-muted">{e.descripcion}</p>}
                      <p className="mt-1 text-[11px] font-semibold" style={{ color: done ? "#12b76a" : active ? "#6366f1" : "#98a2b3" }}>
                        {done ? t.completedLabel : active ? t.currentLabel : t.lockedLabel}
                      </p>
                      {active && (
                        <button onClick={siguiente} disabled={busy} className="mt-2 w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white disabled:opacity-50">
                          {busy ? "…" : `✓ ${t.completeBtn}`}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {/* ── PROGRESO ── */}
        {tab === "progreso" && me && (
          <>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">📈 {t.tabProgreso}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Tile big={`${me.score}`} lbl={t.statScore} tone="text-ok" />
              <Tile big={`${me.ruta_pct}%`} lbl={t.statRuta} />
              <Tile big={`${me.dias_desde_alta}`} lbl={t.statDays} />
              <Tile big={`${me.etapas_completadas}/${me.etapas_total}`} lbl={t.statStages} />
              <Tile big={`${me.tareas_cerradas}`} lbl={t.statTasks} />
            </div>
          </>
        )}

        {/* ── LOGROS + RANKING ── */}
        {tab === "logros" && (
          <>
            {journey && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-lg font-extrabold text-white">{journey.level.n}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{t.level} {journey.level.n} · {journey.level.name}</p>
                  <p className="text-xs text-muted">⭐ {journey.xp} XP</p>
                </div>
                <span className="text-xs font-bold text-brand">{journey.achievements.filter((a) => a.unlocked).length}/{journey.achievements.length} 🏅</span>
              </div>
            )}
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">🏅 {t.achievements}</h2>
            <div className="mb-5 grid grid-cols-3 gap-3">
              {(journey?.achievements ?? []).map((a) => (
                <Badge key={a.key} emoji={a.icon} name={a.label} unlocked={a.unlocked} />
              ))}
            </div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">🏆 {t.ranking}</h2>
            <ul className="space-y-2">
              {ranking.map((r) => (
                <li key={r.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.yo ? "border-brand bg-brand-soft" : "border-line bg-white"}`}>
                  <span className="w-5 text-center text-sm font-extrabold text-brand">{r.pos}</span>
                  <span className="flex-1 truncate text-sm font-medium text-ink">{r.yo ? `${t.you} (${r.nombre}) ⭐` : r.nombre}</span>
                  <span className="text-sm font-bold text-ink">{r.score}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── AYUDA (vía FAB) ── */}
        {tab === "ayuda" && (
          <>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">💬 {t.helpTitle}</h2>
            {resp && <div className="mb-3 rounded-xl bg-brand-soft p-3 text-sm text-ink2">{resp.answer}</div>}
            <div className="flex gap-2">
              <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && preguntar()}
                placeholder={t.helpPlaceholder} className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm focus:border-brand focus:outline-none" />
              <button onClick={preguntar} disabled={pensando} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-white disabled:opacity-50">{pensando ? "…" : "➤"}</button>
            </div>
          </>
        )}
      </div>

      {/* FAB ayuda */}
      {tab !== "ayuda" && (
        <button onClick={() => setTab("ayuda")} className="fixed bottom-20 right-4 z-20 flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-3 text-sm font-bold text-white shadow-lg">💬 {t.tabAyuda}</button>
      )}

      {/* Tab bar */}
      <nav className="sticky bottom-0 flex border-t border-line bg-white">
        {TABS.map((x) => (
          <button key={x.k} onClick={() => setTab(x.k)} className={`flex-1 py-2 text-[10px] ${tab === x.k ? "text-brand" : "text-faint"}`}>
            <span className="block text-lg">{x.ic}</span>{x.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Tile({ big, lbl, tone }: { big: string; lbl: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <p className={`text-2xl font-extrabold ${tone ?? "text-ink"}`}>{big}</p>
      <p className="mt-1 text-[11px] text-muted">{lbl}</p>
    </div>
  );
}

function Badge({ emoji, name, unlocked }: { emoji: string; name: string; unlocked: boolean }) {
  return (
    <div className={`rounded-xl border border-line bg-white p-3 text-center shadow-card ${unlocked ? "" : "opacity-40"}`}>
      <p className="text-3xl">{emoji}</p>
      <p className="mt-1 text-[11px] text-ink2">{name}</p>
    </div>
  );
}
