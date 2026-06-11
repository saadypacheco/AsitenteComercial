"use client";

// Chrome del panel: sidebar navegable (desktop) + drawer (móvil) + topbar con
// usuario, idioma y logout. Compartido por todas las secciones vía el layout.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { getUser, logout, requireAuth, type SessionUser } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";

// Rutas del menú. href=null → sección aún no construida (se muestra "Pronto").
type NavKey = "inicio" | "acciones" | "pendientes" | "agentes" | "grupos" | "eventos" | "capacitaciones" | "reuniones" | "mensajes" | "reportes" | "iaInsights" | "ajustes";
const NAV: { key: NavKey; href: string | null; badge?: boolean }[] = [
  { key: "inicio", href: "/inicio" },
  { key: "acciones", href: "/acciones", badge: true },
  { key: "pendientes", href: "/pendientes" },
  { key: "agentes", href: "/agentes" },
  { key: "grupos", href: "/grupos" },
  { key: "eventos", href: "/eventos" },
  { key: "capacitaciones", href: "/capacitaciones" },
  { key: "reuniones", href: "/reuniones", badge: true },
  { key: "mensajes", href: "/mensajes" },
  { key: "reportes", href: "/reportes" },
  { key: "iaInsights", href: "/ia-insights" },
  { key: "ajustes", href: "/ajustes" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { t, locale, toggle } = useLocale();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const ti = t.inicio;

  useEffect(() => {
    requireAuth();
    const u = getUser();
    if (u?.rol === "agente") {
      window.location.href = "/agente"; // un agente no entra al panel de la líder
      return;
    }
    setUser(u);
  }, []);

  useEffect(() => setOpen(false), [pathname]); // cerrar drawer al navegar

  const nav = (
    <nav className="space-y-1">
      {NAV.map(({ key, href, badge }) => {
        const active = href && pathname.startsWith(href);
        const label = ti.nav[key];
        if (!href) {
          return (
            <span key={key} className="flex cursor-default items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-faint">
              {label}
              <span className="rounded bg-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-faint">{ti.soon}</span>
            </span>
          );
        }
        return (
          <Link
            key={key}
            href={href}
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
              active ? "bg-brand-soft text-brand" : "text-muted hover:bg-soft"
            }`}
          >
            {label}
            {badge && <span className="rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">{ti.newBadge}</span>}
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
          <button
            onClick={toggle}
            className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-muted shadow-card"
            aria-label="toggle language"
          >
            {locale === "es" ? "EN" : "ES"}
          </button>
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
              {(user?.nombre ?? "C").slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden text-right text-sm leading-tight sm:block">
              <span className="block font-semibold text-ink">{user?.nombre ?? "Cecilia"}</span>
              <button onClick={logout} className="block text-xs text-muted hover:text-brand">
                {ti.logout}
              </button>
            </span>
          </span>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
