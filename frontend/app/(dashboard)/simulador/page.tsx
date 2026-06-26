"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar, Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { getToken } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { getProgramaCapacitacion } from "@/lib/queries/gestion";

export default function SimuladorPage() {
  const { locale } = useLocale();
  const es = locale === "es";
  const [agentes, setAgentes] = useState<{ nombre: string; pct: number; etapa_actual: string | null }[]>([]);

  useEffect(() => {
    if (!getToken()) { window.location.href = "/login"; }
    getProgramaCapacitacion(locale).then((p) => setAgentes(p.agentes)).catch(() => {});
  }, [locale]);

  const L = {
    title: es ? "Simulador de Ventas" : "Sales Simulator",
    subtitle: es
      ? "El simulador permite que los agentes practiquen conversaciones de venta en un entorno seguro, con retroalimentación de IA en tiempo real."
      : "The simulator allows agents to practice sales conversations in a safe environment, with real-time AI feedback.",
    howTitle: es ? "¿Cómo funciona?" : "How does it work?",
    step1: es ? "El agente elige un escenario (objeción de precio, primera llamada, cierre)" : "The agent chooses a scenario (price objection, first call, closing)",
    step2: es ? "La IA actúa como prospecto y responde en tiempo real" : "The AI acts as a prospect and responds in real time",
    step3: es ? "Al finalizar, recibe un análisis de su performance" : "At the end, they receive a performance analysis",
    teamTitle: es ? "Estado del equipo en el simulador" : "Team simulator status",
    progressLabel: es ? "Progreso en el path" : "Path progress",
    launchTitle: es ? "Acceder al simulador" : "Launch simulator",
    launchHint: es
      ? "El simulador es parte de la app del agente. Podés acceder como agente para probar los escenarios vos mismo."
      : "The simulator is part of the agent app. You can access it as an agent to try the scenarios yourself.",
    launchBtn: es ? "Abrir simulador del agente" : "Open agent simulator",
    launchNote: es
      ? "Se abre en una nueva pestaña. Usá las credenciales de un agente para ingresar."
      : "Opens in a new tab. Use agent credentials to log in.",
    scenariosTitle: es ? "Escenarios disponibles" : "Available scenarios",
    scenarios: es
      ? [
          { icon: "💰", name: "Objeción de precio", desc: "El prospecto dice que es muy caro" },
          { icon: "📞", name: "Primera llamada en frío", desc: "Primer contacto sin contexto previo" },
          { icon: "🤝", name: "Técnica de cierre", desc: "Llevar al prospecto a tomar la decisión" },
          { icon: "🔄", name: "Renovación de póliza", desc: "Cliente existente con duda de renovar" },
          { icon: "❓", name: "Consulta de producto", desc: "El prospecto pide información sin intención clara" },
        ]
      : [
          { icon: "💰", name: "Price objection", desc: "The prospect says it's too expensive" },
          { icon: "📞", name: "Cold first call", desc: "First contact with no prior context" },
          { icon: "🤝", name: "Closing technique", desc: "Guide the prospect to make a decision" },
          { icon: "🔄", name: "Policy renewal", desc: "Existing client unsure about renewing" },
          { icon: "❓", name: "Product inquiry", desc: "Prospect asking for info with no clear intent" },
        ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">🎯 {L.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{L.subtitle}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {/* How it works */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand">{L.howTitle}</h2>
            <ol className="space-y-3">
              {[L.step1, L.step2, L.step3].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                  <p className="text-sm text-ink2 pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
          </Card>

          {/* Available scenarios */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand">{L.scenariosTitle}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {L.scenarios.map((s) => (
                <div key={s.name} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3 shadow-card">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{s.name}</p>
                    <p className="text-xs text-muted">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Launch */}
          <Card className="p-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-brand">{L.launchTitle}</h2>
            <p className="mb-4 text-sm text-muted">{L.launchHint}</p>
            <a
              href="/agente"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:opacity-90"
            >
              🚀 {L.launchBtn}
            </a>
            <p className="mt-2 text-xs text-faint">{L.launchNote}</p>
          </Card>
        </div>

        {/* Sidebar: team status */}
        <aside>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">👥 {L.teamTitle}</h2>
            {agentes.length === 0 && <p className="text-sm text-muted">…</p>}
            <ul className="space-y-3">
              {agentes.map((a) => (
                <li key={a.nombre} className="flex items-center gap-2.5">
                  <Avatar name={a.nombre} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">{a.nombre}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${a.pct}%` }} />
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted">{L.progressLabel}: {a.pct}%</p>
                  </div>
                  <Badge tone={a.pct >= 100 ? "ok" : a.pct < 30 ? "warning" : "brand"}>
                    {a.pct}%
                  </Badge>
                </li>
              ))}
            </ul>
            <Link href="/inicio" className="mt-4 block text-xs font-semibold text-brand hover:underline">
              {es ? "← Volver al panel" : "← Back to dashboard"}
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
