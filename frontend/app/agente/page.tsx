"use client";

// App del agente (Producto ③): su ruta de aprendizaje, progreso, logros y ayuda.
// Mobile-first con tab bar inferior. Datos reales (etapa_progreso del agente).
import { useEffect, useState } from "react";

import { getUser, logout, requireAgent } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { askAi } from "@/lib/queries/executive";
import { avanzar, getMe, getRuta, type AgenteMe, type Ruta } from "@/lib/queries/agente";

type Tab = "ruta" | "progreso" | "logros" | "ayuda";

export default function AgentePage() {
  const { locale, t: dict } = useLocale();
  const t = dict.agente;
  const [nombre, setNombre] = useState("");
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [me, setMe] = useState<AgenteMe | null>(null);
  const [tab, setTab] = useState<Tab>("ruta");
  const [busy, setBusy] = useState(false);

  const [pregunta, setPregunta] = useState("");
  const [resp, setResp] = useState<{ answer: string } | null>(null);
  const [pensando, setPensando] = useState(false);

  function reload() {
    getRuta(locale).then(setRuta).catch(() => setRuta(null));
    getMe(locale).then(setMe).catch(() => setMe(null));
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
    setResp(await askAi(pregunta, locale).catch(() => ({ answer: "—" })));
    setPensando(false);
  }

  const score = me?.score ?? 0;
  const TABS: { k: Tab; ic: string; label: string }[] = [
    { k: "ruta", ic: "🎯", label: t.tabRuta },
    { k: "progreso", ic: "📈", label: t.tabProgreso },
    { k: "logros", ic: "🏅", label: t.tabLogros },
    { k: "ayuda", ic: "💬", label: t.tabAyuda },
  ];

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
        <div className="text-center text-xs text-muted">
          <p className="text-lg">📅</p>{me?.dias_desde_alta ?? 0} {t.statDays.toLowerCase()}
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
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
                      <p className="text-sm font-bold text-ink">{t.tabRuta === "Path" ? `Step ${e.orden}` : `Paso ${e.orden}`} · {e.nombre}</p>
                      {e.descripcion && <p className="mt-0.5 text-xs text-muted">{e.descripcion}</p>}
                      <p className="mt-1 text-[11px] font-semibold" style={{ color: done ? "#12b76a" : active ? "#6366f1" : "#98a2b3" }}>
                        {done ? t.completedLabel : active ? t.currentLabel : t.lockedLabel}
                      </p>
                      {active && (
                        <button onClick={siguiente} disabled={busy}
                          className="mt-2 w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white disabled:opacity-50">
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

        {/* ── LOGROS ── */}
        {tab === "logros" && ruta && (
          <>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">🏅 {t.achievements}</h2>
            <div className="grid grid-cols-3 gap-3">
              <Badge emoji="🥇" name={t.badgeStart} unlocked={ruta.pct > 0} />
              <Badge emoji="🚀" name={t.badgeHalf} unlocked={ruta.pct >= 50} />
              <Badge emoji="🏆" name={t.badgeDone} unlocked={ruta.pct === 100} />
            </div>
          </>
        )}

        {/* ── AYUDA ── */}
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

      {/* Tab bar */}
      <nav className="sticky bottom-0 flex border-t border-line bg-white">
        {TABS.map((x) => (
          <button key={x.k} onClick={() => setTab(x.k)} className={`flex-1 py-2.5 text-[10px] ${tab === x.k ? "text-brand" : "text-faint"}`}>
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
