"use client";

// App del agente (Producto ③): Hoy, Agenda (Zoom), Ruta, Progreso, Logros + Ayuda.
// Mobile-first con tab bar inferior. Datos reales (etapas, sesiones, ranking).
import { useEffect, useState } from "react";

import { getUser, logout, requireAgent } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { askAi } from "@/lib/queries/executive";
import {
  avanzar, getAgenda, getMe, getRanking, getRuta,
  type AgenteMe, type RankItem, type Ruta, type Sesion,
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

  const score = me?.score ?? 0;
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

      {/* Score strip */}
      <div className="mx-4 mt-4 flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-card">
        <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: `conic-gradient(#12b76a 0% ${score}%, #e7eaf0 ${score}% 100%)` }}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-lg font-extrabold text-ink">{score}</span>
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted">{t.score}</p>
          <p className="text-sm font-bold text-ok">🟢 {ruta ? `${ruta.pct}% ${t.tabRuta.toLowerCase()}` : "—"}</p>
        </div>
        <div className="text-center text-xs text-muted"><p className="text-lg">📅</p>{me?.dias_desde_alta ?? 0} {t.statDays.toLowerCase()}</div>
      </div>

      <div className="flex-1 px-4 py-4">
        {/* ── HOY ── */}
        {tab === "hoy" && (
          <div className="space-y-4">
            {actual && (
              <div className="rounded-xl border border-line border-l-4 border-l-brand bg-white p-4 shadow-card">
                <p className="text-xs font-bold uppercase tracking-wide text-brand">{t.nextStep}</p>
                <p className="mt-1 text-sm font-bold text-ink">{stepWord(actual.orden)} · {actual.nombre}</p>
                {actual.descripcion && <p className="text-xs text-muted">{actual.descripcion}</p>}
                <button onClick={() => setTab("ruta")} className="mt-2 w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white">{t.continueBtn}</button>
              </div>
            )}
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
            <div className="rounded-xl border border-line bg-gradient-to-br from-[#f3fdf7] to-white p-4 shadow-card">
              <p className="flex items-center gap-2 text-sm font-bold text-ok">🏅 {t.goodJob}</p>
              <p className="text-xs text-muted">{t.keepGoing}</p>
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
        {tab === "logros" && ruta && (
          <>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">🏅 {t.achievements}</h2>
            <div className="mb-5 grid grid-cols-3 gap-3">
              <Badge emoji="🥇" name={t.badgeStart} unlocked={ruta.pct > 0} />
              <Badge emoji="🚀" name={t.badgeHalf} unlocked={ruta.pct >= 50} />
              <Badge emoji="🏆" name={t.badgeDone} unlocked={ruta.pct === 100} />
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
