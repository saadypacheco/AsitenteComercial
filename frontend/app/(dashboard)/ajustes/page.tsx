"use client";

// AJUSTES — perfil de la sesión, preferencia de idioma, estado de la IA y logout.
import { useEffect, useState } from "react";

import { Avatar, Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { getUser, logout, type SessionUser } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { getConfigStatus, type ConfigStatus } from "@/lib/queries/executive";

export default function AjustesPage() {
  const { locale, setLocale, t: dict } = useLocale();
  const t = dict.ajustes;
  const [user, setUser] = useState<SessionUser | null>(null);
  const [cfg, setCfg] = useState<ConfigStatus | null>(null);

  useEffect(() => {
    setUser(getUser());
    getConfigStatus().then(setCfg).catch(() => setCfg(null));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8">
      <h1 className="mb-5 text-2xl font-bold text-ink">{dict.inicio.nav.ajustes}</h1>

      {/* Perfil */}
      <Card className="mb-4 p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand">{t.profile}</h2>
        <div className="flex items-center gap-3">
          <Avatar name={user?.nombre ?? "Cecilia"} />
          <div>
            <p className="font-semibold text-ink">{user?.nombre ?? "Cecilia"}</p>
            <p className="text-sm text-muted">{user?.email}</p>
          </div>
          {user?.rol && <Badge tone="brand">{user.rol}</Badge>}
        </div>
      </Card>

      {/* Idioma */}
      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{t.language}</h2>
        <div className="flex gap-2">
          {(["es", "en"] as const).map((l) => (
            <button key={l} onClick={() => setLocale(l)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${locale === l ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-soft"}`}>
              {l === "es" ? "Español" : "English"}
            </button>
          ))}
        </div>
      </Card>

      {/* Estado IA */}
      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">{t.iaStatus}</h2>
        {cfg ? (
          <>
            <div className="flex items-center gap-2">
              <Badge tone={cfg.ia_enabled ? "ok" : "warning"}>{cfg.ia_enabled ? t.iaActive : t.iaFallback}</Badge>
              <span className="text-xs text-muted">{cfg.llm_model}</span>
            </div>
            {!cfg.ia_enabled && <p className="mt-2 text-xs text-faint">{t.iaHint}</p>}
            <p className="mt-2 text-xs text-faint">{t.environment}: {cfg.environment}</p>
          </>
        ) : (
          <p className="text-sm text-muted">…</p>
        )}
      </Card>

      {/* Logout */}
      <button onClick={logout} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-danger hover:bg-red-50">
        {t.logout}
      </button>
    </div>
  );
}
