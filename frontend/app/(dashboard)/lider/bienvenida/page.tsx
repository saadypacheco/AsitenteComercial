"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { completarLiderOnboarding, getLiderOnboarding, type LiderOnboarding } from "@/lib/queries/executive";

const ICONS: Record<string, string> = {
  bienvenida: "🏠",
  equipo: "👥",
  pendientes: "⏳",
  acciones: "🧠",
  briefing: "📱",
};

export default function LiderBienvenidaPage() {
  const { locale } = useLocale();
  const lang = locale === "en" ? "en" : "es";
  const [data, setData] = useState<LiderOnboarding | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user || user.rol === "agente") {
      window.location.href = "/inicio";
      return;
    }
    getLiderOnboarding(lang).then((d) => {
      if (d.completado) {
        window.location.href = "/inicio";
      } else {
        setData(d);
      }
    }).catch(() => { window.location.href = "/inicio"; });
  }, [lang]);

  async function comenzar() {
    setLoading(true);
    await completarLiderOnboarding().catch(() => {});
    setDone(true);
    setTimeout(() => { window.location.href = "/inicio"; }, 800);
  }

  if (!data) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="text-sm text-muted">{lang === "en" ? "Loading…" : "Cargando…"}</p>
      </div>
    );
  }

  const t = lang === "en"
    ? { title: "Welcome, leader! 👋", sub: "Here are your first 5 steps to get started with your team.", btn: done ? "Entering panel…" : "Start now →", note: "You can come back to any section at any time from the menu." }
    : { title: "¡Bienvenido/a, líder! 👋", sub: "Estos son tus primeros 5 pasos para arrancar con tu equipo.", btn: done ? "Entrando al panel…" : "Comenzar ahora →", note: "Podés volver a cualquier sección en cualquier momento desde el menú." };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl shadow-card">
          🌟
        </div>
        <h1 className="text-2xl font-bold text-ink">{t.title}</h1>
        <p className="mt-2 text-sm text-muted">{t.sub}</p>
      </div>

      <ol className="mb-8 space-y-3">
        {data.pasos.map((paso, i) => (
          <li key={paso.id}>
            <Card className="flex items-start gap-4 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-lg font-bold text-brand">
                {i === 0 ? "✓" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{ICONS[paso.id] ?? "▸"} {paso.titulo}</p>
                <p className="text-xs text-muted">{paso.detalle}</p>
              </div>
              {paso.href && (
                <a href={paso.href} className="shrink-0 rounded-lg border border-brand px-3 py-1 text-xs font-medium text-brand hover:bg-brand/5">
                  {lang === "en" ? "Go →" : "Ir →"}
                </a>
              )}
              {i === 0 && (
                <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-xs font-medium text-ok">
                  {lang === "en" ? "Done" : "Listo"}
                </span>
              )}
            </Card>
          </li>
        ))}
      </ol>

      <div className="text-center">
        <button
          onClick={comenzar}
          disabled={loading || done}
          className="w-full rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
        >
          {t.btn}
        </button>
        <p className="mt-3 text-xs text-faint">{t.note}</p>
      </div>
    </div>
  );
}
