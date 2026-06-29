"use client";

// Canje del MAGIC LINK: lee ?token= del URL, lo verifica contra el backend y, si
// es válido, abre sesión y entra al panel. Multilenguaje (Principio VI).
import { useEffect, useState } from "react";

import { Card } from "@/components/ui";
import { verifyMagicLink } from "@/lib/auth";
import { getDictionary, getStoredLocale, type Locale } from "@/lib/i18n";

export default function MagicPage() {
  const [locale, setLocale] = useState<Locale>("es");
  const [status, setStatus] = useState<"verifying" | "ok" | "invalid">("verifying");
  const t = getDictionary(locale).magic;

  useEffect(() => {
    setLocale(getStoredLocale());
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("invalid");
      return;
    }
    verifyMagicLink(token)
      .then(({ rol, must_set_password }) => {
        setStatus("ok");
        if (must_set_password) {
          window.location.href = "/set-password";
        } else if (rol === "agente") {
          window.location.href = "/agente";
        } else {
          window.location.href = "/inicio";
        }
      })
      .catch(() => setStatus("invalid"));
  }, []);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-lg text-white">
          ▮▮
        </span>
        {status === "verifying" && <p className="text-sm text-muted">{t.verifying}</p>}
        {status === "ok" && <p className="text-sm font-medium text-ok">{t.ok}</p>}
        {status === "invalid" && (
          <>
            <p className="mb-4 text-sm text-danger">{t.invalid}</p>
            <a href="/login" className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
              {t.requestNew}
            </a>
          </>
        )}
      </Card>
    </main>
  );
}
