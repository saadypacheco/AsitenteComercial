"use client";

// Login de la líder (FR-009) — multilenguaje es/en (Principio VI) + recuperación
// por MAGIC LINK. Responsive:
//   · Desktop: split (hero de marca a la izquierda + formulario a la derecha).
//   · Móvil:   la foto cubre TODA la pantalla y el formulario flota en una tarjeta.
// Si existe /public/login-hero3.jpg se usa de fondo; si no, queda el color base.
import { useEffect, useState } from "react";

import { login, requestMagicLink } from "@/lib/auth";
import { DEFAULT_LOCALE, getDictionary, getStoredLocale, storeLocale, type Locale } from "@/lib/i18n";

type Mode = "signin" | "recover";
const HERO = "/login-hero3.jpg"; // cambiá a login-hero.jpg / login-hero2.jpg si preferís

export default function LoginPage() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [mode, setMode] = useState<Mode>("signin");

  const [email, setEmail] = useState("cecilia@demo.com");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const t = getDictionary(locale).login;

  useEffect(() => setLocale(getStoredLocale()), []);
  function toggleLocale() {
    const next: Locale = locale === "es" ? "en" : "es";
    setLocale(next);
    storeLocale(next);
  }

  async function onSignin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      window.location.href = "/inicio";
    } catch {
      setError(t.badCreds);
      setLoading(false);
    }
  }

  async function onRecover(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await requestMagicLink(email);
      setSent(true);
      setDevLink(r.link ?? null);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-card transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

  // Capas del fondo (foto + tinte de marca + scrim), reutilizadas en móvil y desktop.
  const heroLayers = (
    <>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${HERO}')` }} />
      <div className="absolute inset-0 bg-brand/25 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020]/85 via-[#0b1020]/35 to-[#0b1020]/10" />
      <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-brand-2/20 blur-3xl" />
    </>
  );

  const formInner = (
    <>
      {mode === "signin" ? (
        <>
          <h2 className="mb-1 text-2xl font-bold text-ink">{t.signin}</h2>
          <p className="mb-7 text-sm text-muted">{t.signinHint}</p>

          <form onSubmit={onSignin} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink2">{t.email}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="username" placeholder={t.emailPlaceholder} className={inputCls} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink2">{t.password}</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" placeholder="••••••••" className={inputCls} />
            </label>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-brand" />
                {t.remember}
              </label>
              <button type="button" onClick={() => { setMode("recover"); setError(null); setSent(false); }}
                className="text-sm font-medium text-brand hover:underline">
                {t.forgot}
              </button>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-50">
              {loading ? t.submitting : t.submit}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-faint">
            {t.termsPre} <a className="text-muted underline" href="#">{t.terms}</a> {t.and}{" "}
            <a className="text-muted underline" href="#">{t.privacy}</a>.
          </p>
          <p className="mt-4 text-center text-xs text-faint">Demo: cecilia@demo.com · demo1234</p>
        </>
      ) : (
        <>
          <h2 className="mb-1 text-2xl font-bold text-ink">{t.recoverTitle}</h2>
          <p className="mb-7 text-sm text-muted">{t.recoverHint}</p>

          {!sent ? (
            <form onSubmit={onRecover} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink2">{t.email}</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username" placeholder={t.emailPlaceholder} className={inputCls} />
              </label>
              <button type="submit" disabled={loading}
                className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-50">
                {loading ? t.sending : t.sendLink}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-ok">{t.linkSent}</p>
              {devLink && (
                <div className="rounded-lg border border-line bg-white p-3 text-xs text-muted">
                  <p className="mb-2">{t.devLink}</p>
                  <a href={devLink} className="inline-block rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white">
                    {t.openLink}
                  </a>
                </div>
              )}
            </div>
          )}

          <button onClick={() => { setMode("signin"); setError(null); setSent(false); setDevLink(null); }}
            className="mt-6 block w-full text-center text-sm font-medium text-brand hover:underline">
            {t.backToLogin}
          </button>
        </>
      )}
    </>
  );

  return (
    <main className="relative min-h-screen md:grid md:grid-cols-2">
      {/* Fondo full-screen SOLO en móvil (en desktop lo pone el hero de la izquierda) */}
      <div className="absolute inset-0 md:hidden">{heroLayers}</div>

      {/* Toggle de idioma (siempre visible, arriba a la derecha) */}
      <button
        onClick={toggleLocale}
        className="absolute right-5 top-5 z-20 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur md:border-line md:bg-white md:text-muted md:shadow-card"
        aria-label="toggle language"
      >
        {locale === "es" ? "EN" : "ES"}
      </button>

      {/* ── Hero (columna izquierda en desktop) ────────────────────────── */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#0b1020] p-12 text-white md:flex">
        {heroLayers}
        <div className="relative z-10 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">▮▮</span>
          <span className="text-sm font-semibold tracking-wide">mentorcomercial</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-6xl font-bold leading-tight">
            {t.welcome}
            <br />
            Cecilia
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/85">{t.heroText}</p>
        </div>
        <div className="relative z-10 text-xs text-white/60">© 2026 mentorcomercial · {t.footer}</div>
      </section>

      {/* ── Formulario (columna derecha en desktop · tarjeta flotante en móvil) ── */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12 md:min-h-0 md:bg-[#f5f7fb]">
        {/* Encabezado de marca SOLO en móvil (sobre la foto) */}
        <div className="mb-6 text-center text-white md:hidden">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">▮▮</span>
            <span className="text-sm font-semibold tracking-wide">mentorcomercial</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight">
            {t.welcome} Cecilia
          </h1>
        </div>

        {/* Tarjeta: blanca y flotante en móvil; plana sobre el panel claro en desktop */}
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card-lg md:bg-transparent md:p-0 md:shadow-none">
          {formInner}
        </div>
      </section>
    </main>
  );
}
