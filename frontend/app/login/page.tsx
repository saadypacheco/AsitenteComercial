"use client";

// Login de la líder (FR-009). Tema claro/profesional del design system.
// Tras autenticar, el JWT (con tenant_id) queda en el cliente y todo el dashboard
// pasa a filtrar por ese tenant en el backend.
import { useState } from "react";

import { Card } from "@/components/ui";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("cecilia@demo.com");
  const [password, setPassword] = useState("");
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
      setError("Credenciales incorrectas");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm p-7">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-lg text-white">
            ▮▮
          </span>
          <h1 className="text-gradient text-xl font-bold">mentorcomercial</h1>
          <p className="mt-1 text-sm text-muted">Ingresá a tu panel</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-faint">
          Demo: cecilia@demo.com · demo1234
        </p>
      </Card>
    </main>
  );
}
