"use client";

// Canje del magic link del agente → abre sesión y entra a su capacitación.
import { useEffect, useState } from "react";

import { verifyAgentMagic } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";

export default function AgenteMagicPage() {
  const { t: dict } = useLocale();
  const t = dict.agente;
  const [status, setStatus] = useState<"verifying" | "invalid">("verifying");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return setStatus("invalid");
    verifyAgentMagic(token)
      .then(() => (window.location.href = "/agente"))
      .catch(() => setStatus("invalid"));
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#e9edf3] px-4 text-center">
      <div className="w-full max-w-xs rounded-3xl bg-white p-8 shadow-card-lg">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-lg text-white">🎓</div>
        {status === "verifying" ? (
          <p className="text-sm text-muted">{t.verifying}</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-danger">{t.invalid}</p>
            <a href="/agente/login" className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">{t.tryAgain}</a>
          </>
        )}
      </div>
    </main>
  );
}
