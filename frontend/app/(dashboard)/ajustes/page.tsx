"use client";

// AJUSTES — perfil de la sesión, preferencia de idioma, estado de la IA y logout.
import { useEffect, useState } from "react";

import { Avatar, Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { getUser, logout, type SessionUser } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { getBriefingConfig, getConfigStatus, previewBriefing, saveBriefingConfig, sendBriefingNow, type BriefingConfig, type ConfigStatus } from "@/lib/queries/executive";

export default function AjustesPage() {
  const { locale, setLocale, t: dict } = useLocale();
  const t = dict.ajustes;
  const [user, setUser] = useState<SessionUser | null>(null);
  const [cfg, setCfg] = useState<ConfigStatus | null>(null);

  const [bf, setBf] = useState<BriefingConfig | null>(null);
  const [bfSaved, setBfSaved] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [sentModo, setSentModo] = useState<string | null>(null);

  useEffect(() => {
    setUser(getUser());
    getConfigStatus().then(setCfg).catch(() => setCfg(null));
    getBriefingConfig().then(setBf).catch(() => setBf(null));
  }, []);

  useEffect(() => { setPreview(null); }, [locale]);

  async function guardarBriefing() {
    if (!bf) return;
    await saveBriefingConfig({ owner_wa_jid: bf.owner_wa_jid, briefing_enabled: bf.briefing_enabled, briefing_hora: bf.briefing_hora }).catch(() => {});
    setBfSaved(true);
    setTimeout(() => setBfSaved(false), 2000);
  }
  async function verPreview() {
    setPreview((await previewBriefing(locale).catch(() => ({ texto: "—" }))).texto);
  }
  async function enviarPrueba() {
    const r = await sendBriefingNow(locale).catch(() => ({ texto: "", modo: "error", ok: false, jid: null }));
    setPreview(r.texto || preview);
    setSentModo(r.modo);
    setTimeout(() => setSentModo(null), 4000);
  }

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

      {/* Briefing diario por WhatsApp (Feature E) */}
      {bf && (
        <Card className="mb-4 p-5">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand">📲 {t.briefing}</h2>
            <Badge tone={bf.waha_enabled ? "ok" : "warning"}>{bf.waha_enabled ? t.briefingReal : t.briefingSimulado}</Badge>
          </div>
          <p className="mb-4 text-xs text-faint">{t.briefingHint}</p>

          <label className="mb-1 block text-xs font-semibold text-muted">{t.briefingNumber}</label>
          <input
            value={bf.owner_wa_jid ?? ""}
            onChange={(e) => setBf({ ...bf, owner_wa_jid: e.target.value })}
            placeholder={t.briefingNumberPh}
            className="mb-3 w-full rounded-lg bg-soft px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none"
          />

          <div className="mb-3 flex items-center gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">{t.briefingHour}</label>
              <select
                value={bf.briefing_hora}
                onChange={(e) => setBf({ ...bf, briefing_hora: Number(e.target.value) })}
                className="rounded-lg bg-soft px-3 py-2 text-sm text-ink focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-ink2">
              <input type="checkbox" checked={bf.briefing_enabled}
                onChange={(e) => setBf({ ...bf, briefing_enabled: e.target.checked })} />
              {t.briefingEnabled}
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={guardarBriefing} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              {bfSaved ? t.saved : t.save}
            </button>
            <button onClick={verPreview} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:bg-soft">
              {t.briefingPreview}
            </button>
            <button onClick={enviarPrueba} className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-soft">
              {t.briefingSend}
            </button>
            {sentModo && <Badge tone={sentModo === "real" ? "ok" : sentModo === "error" ? "danger" : "neutral"}>{t.briefingSent} · {sentModo}</Badge>}
          </div>

          {preview && (
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-soft p-4 text-sm text-ink2">{preview}</pre>
          )}
        </Card>
      )}

      {/* Logout */}
      <button onClick={logout} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-danger hover:bg-red-50">
        {t.logout}
      </button>
    </div>
  );
}
