"use client";

// Login de la líder (FR-009) — layout dividido: panel hero (marca) + formulario.
// Si existe /public/login-hero.jpg se usa como foto de fondo; si no, queda el
// gradiente de marca (índigo→violeta). Tema claro/profesional del design system.
import { useState } from "react";

import { login } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("cecilia@demo.com");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      window.location.href = "/inicio";
    } catch {
      setError("Email o contraseña incorrectos");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen md:grid md:grid-cols-2">
      {/* ── Panel izquierdo: hero de marca ─────────────────────────────── */}
      <section className="relative flex min-h-[34vh] flex-col justify-between overflow-hidden bg-brand p-8 text-white md:min-h-screen md:p-12">
        {/* Foto opcional (cae al gradiente si no existe el archivo) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/login-hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand/85 via-brand/80 to-brand-2/85" />
        {/* Formas decorativas suaves */}
        <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-brand-2/30 blur-3xl" />

        {/* Marca arriba */}
        <div className="relative z-10 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">▮▮</span>
          <span className="text-sm font-semibold tracking-wide">mentorcomercial</span>
        </div>

        {/* Welcome */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Welcome
            <br />
            Cecilia
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80 md:text-base">
            Tu panel de inteligencia comercial sobre WhatsApp: el pulso del día, tus pendientes,
            las oportunidades detectadas y el ranking de tu equipo, en un solo lugar.
          </p>
        </div>

        <div className="relative z-10 hidden text-xs text-white/60 md:block">
          © {"2026"} mentorcomercial · Inteligencia comercial
        </div>
      </section>

      {/* ── Panel derecho: formulario ──────────────────────────────────── */}
      <section className="flex items-center justify-center bg-[#f5f7fb] px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="mb-1 text-2xl font-bold text-ink">Iniciar sesión</h2>
          <p className="mb-7 text-sm text-muted">Ingresá con tu cuenta para continuar.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink2">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="vos@empresa.com"
                className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-card transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink2">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-card transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-brand"
                />
                Recordarme
              </label>
              <a className="text-sm font-medium text-brand hover:underline" href="#">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-faint">
            Al ingresar aceptás los{" "}
            <a className="text-muted underline" href="#">Términos de servicio</a> y la{" "}
            <a className="text-muted underline" href="#">Política de privacidad</a>.
          </p>
          <p className="mt-4 text-center text-xs text-faint">
            Demo: cecilia@demo.com · demo1234
          </p>
        </div>
      </section>
    </main>
  );
}
