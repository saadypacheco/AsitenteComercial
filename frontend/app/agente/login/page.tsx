"use client";

// Login del agente: magic link por celular o email (sin contraseña).
import { useState } from "react";

import { requestAgentMagic } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";

export default function AgenteLoginPage() {
  const { t: dict } = useLocale();
  const t = dict.agente;
  const [id, setId] = useState("maria@demo.com");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await requestAgentMagic(id);
      setLink(r.link ?? null);
    } catch {
      /* no revelamos */
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.1)]">
        <div className="bg-gradient-to-br from-[#38BDF8] to-[#7DD3FC] px-6 py-8 text-center text-white">
          <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-2xl backdrop-blur">🎓</div>
          <h1 className="text-lg font-bold">{t.loginTitle}</h1>
          <p className="mt-1 text-sm text-white/85">{t.loginHint}</p>
        </div>
        <div className="p-6">
          {!sent ? (
            <form onSubmit={submit} className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink2">{t.identifier}</span>
                <input value={id} onChange={(e) => setId(e.target.value)} autoFocus
                  className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none" />
              </label>
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-[#38BDF8] py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(56,189,248,0.4)] disabled:opacity-50">
                {loading ? t.sending : t.send}
              </button>
              <p className="text-center text-xs text-faint">Demo: maria@demo.com · 5491111</p>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-ok">{t.sent}</p>
              {link && (
                <div className="rounded-lg border border-line bg-white p-3 text-xs text-muted">
                  <p className="mb-2">{t.devLink}</p>
                  <a href={link} className="inline-block rounded-xl bg-[#38BDF8] px-3 py-2 text-xs font-semibold text-white">{t.openLink}</a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
