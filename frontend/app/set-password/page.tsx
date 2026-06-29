"use client";

import { useState } from "react";

import { authFetch, getToken } from "@/lib/auth";

const inputCls =
  "w-full rounded-lg border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white " +
  "placeholder:text-white/45 backdrop-blur transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/25";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { detail?: string }).detail ?? "Error al guardar la contraseña");
      }
      window.location.href = "/agente";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen" style={{ background: "#0b1020" }}>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020]/90 via-[#0b1020]/45 to-[#0b1020]/15" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur text-base">▮▮</span>
            <span className="text-sm font-semibold tracking-wide">Mentor Comercial</span>
          </div>

          <h2 className="mb-1 text-2xl font-bold text-white">Creá tu contraseña</h2>
          <p className="mb-7 text-sm text-white/70">
            Es la primera vez que entrás. Elegí una contraseña para acceder en el futuro.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/85">Nueva contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className={inputCls}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/85">Confirmá la contraseña</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Repetí la contraseña"
                className={inputCls}
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
