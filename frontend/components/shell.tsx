"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { getToken, getUser, logout, type SessionUser } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { askAi } from "@/lib/queries/executive";
import { getNavBadges, type NavBadges } from "@/lib/queries/gestion";

// Rutas del menú: 5 secciones enfocadas en el seguimiento del onboarding comercial.
type NavKey = "inicio" | "conocimiento" | "agentes" | "reuniones" | "simulador" | "ajustes" | "paraCecilia";
const NAV: { key: NavKey; href: string; icon: string }[] = [
  { key: "inicio",       href: "/inicio",        icon: "🏠" },
  { key: "conocimiento", href: "/conocimiento",  icon: "🧠" },
  { key: "agentes",      href: "/agentes",       icon: "👥" },
  { key: "reuniones",    href: "/reuniones",     icon: "📹" },
  { key: "simulador",    href: "/simulador",     icon: "🎯" },
  { key: "ajustes",      href: "/ajustes",       icon: "⚙️" },
  { key: "paraCecilia",  href: "/para-cecilia",  icon: "🌟" },
];

type Msg = { role: "user" | "ai"; text: string };

const QUICK_ES = ["¿Quién está atascado?", "Resumí la semana", "¿Quién no inició?"];
const QUICK_EN = ["Who is stuck?", "Summarize the week", "Who hasn't started?"];

function FloatingChat({ locale }: { locale: string }) {
  const es = locale === "es";
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setThinking(true);
    const res = await askAi(q, locale).catch(() => ({
      answer: es ? "Error al procesar la consulta." : "Error processing the query.",
      source: "error",
    }));
    setMsgs((m) => [...m, { role: "ai", text: res.answer }]);
    setThinking(false);
  }

  const quick = es ? QUICK_ES : QUICK_EN;

  return (
    <>
      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] md:right-6">
          {/* Header */}
          <div className="flex items-center justify-between bg-brand px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <span className="text-sm font-bold text-white">{es ? "Chat IA" : "AI Chat"}</span>
            </div>
            <button onClick={() => setOpen(false)} className="grid h-6 w-6 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30 text-xs">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ maxHeight: 320, minHeight: 200 }}>
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quick.map((q) => (
                  <button key={q} onClick={() => send(q)}
                    className="rounded-full border border-line bg-soft px-3 py-1 text-xs text-muted hover:border-brand hover:text-brand">
                    {q}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-brand text-white rounded-br-sm"
                    : "bg-soft text-ink rounded-bl-sm"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-xl rounded-bl-sm bg-soft px-3 py-2 text-xs text-muted">
                  <span className="animate-pulse">{es ? "Pensando…" : "Thinking…"}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-line p-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder={es ? "Escribí tu consulta…" : "Type your question…"}
              disabled={thinking}
              className="flex-1 rounded-lg bg-soft px-3 py-2 text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
            />
            <button onClick={() => send(input)} disabled={thinking || !input.trim()}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-white disabled:opacity-40 text-sm">
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 grid h-13 w-13 place-items-center rounded-full bg-brand text-white shadow-[0_4px_16px_-4px_rgba(99,102,241,0.5)] transition hover:opacity-90 active:scale-95 md:right-6"
        style={{ width: 52, height: 52 }}
        aria-label={es ? "Abrir chat IA" : "Open AI chat"}
      >
        {open ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { t, locale, toggle } = useLocale();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const [badges, setBadges] = useState<NavBadges>({ inicio: 0, conocimiento: 0, agentes: 0, reuniones: 0 });
  const ti = t.inicio;

  useEffect(() => {
    if (!getToken()) { window.location.href = "/login"; return; }
    const u = getUser();
    if (u?.rol === "agente") { window.location.href = "/agente"; return; }
    setUser(u);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    getNavBadges().then(setBadges).catch(() => {});
    const interval = setInterval(() => {
      getNavBadges().then(setBadges).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, [ready]);

  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="space-y-1">
      {NAV.map(({ key, href, icon }) => {
        const active = pathname.startsWith(href);
        const label = ti.nav[key];
        const badge = badges[key as keyof NavBadges] ?? 0;
        return (
          <Link key={key} href={href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-brand-soft text-brand" : "text-muted hover:bg-soft hover:text-ink"
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="flex-1">{label}</span>
            {badge > 0 && !active && (
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2 px-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">▮▮</span>
      <span className="text-sm font-semibold text-ink">{t.login.brand}</span>
    </div>
  );

  if (!ready) return <div className="min-h-screen bg-[#f5f7fb]" />;

  return (
    <div className="min-h-screen bg-[#f5f7fb] md:flex">
      {/* Sidebar desktop */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-white px-3 py-5 md:flex">
        <div className="mb-6">{brand}</div>
        {nav}
      </aside>

      {/* Drawer móvil */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white px-3 py-5 shadow-card-lg">
            <div className="mb-6">{brand}</div>
            {nav}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/80 px-4 py-2.5 backdrop-blur md:px-8">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-muted hover:bg-soft md:hidden" aria-label={ti.menu}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
          </button>
          {user?.alcance === "equipo" && (
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">👥 {ti.scopeTeam}</span>
          )}
          <div className="flex-1" />
          <button onClick={toggle}
            className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-muted shadow-card"
            aria-label="toggle language">
            {locale === "es" ? "EN" : "ES"}
          </button>
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
              {(user?.nombre ?? "C").slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden text-right text-sm leading-tight sm:block">
              <span className="block font-semibold text-ink">{user?.nombre ?? "Cecilia"}</span>
              <button onClick={logout} className="block text-xs text-muted hover:text-brand">{ti.logout}</button>
            </span>
          </span>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Floating AI chat — disponible en todas las páginas */}
      <FloatingChat locale={locale} />
    </div>
  );
}
