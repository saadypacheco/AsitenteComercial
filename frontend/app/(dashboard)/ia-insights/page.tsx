"use client";

// IA INSIGHTS — el cerebro del centro de control: recomendaciones, resumen del día,
// clientes en riesgo, agentes saturados, oportunidades y chat con la IA.
import { useEffect, useState } from "react";

import { Badge, ToneDot } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { askAi, getAiSummary, getCommand, getRiesgoAgentes, type AiBullet, type Command, type RiesgoAgente, type Tone } from "@/lib/queries/executive";

const PRIO_TONE: Record<string, Tone> = { alta: "danger", media: "warning", baja: "ok" };
const NIVEL_TONE: Record<string, Tone> = { alto: "danger", medio: "warning", bajo: "ok" };

function money(n: number) {
  return "$" + (n ?? 0).toLocaleString("en-US");
}

export default function IaInsightsPage() {
  const { locale, t: dict } = useLocale();
  const ci = dict.command;
  const g = dict.gestion;

  const [c, setC] = useState<Command | null>(null);
  const [bullets, setBullets] = useState<AiBullet[] | null>(null);
  const [src, setSrc] = useState("");
  const [riesgo, setRiesgo] = useState<RiesgoAgente[] | null>(null);

  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState<{ answer: string; source: string } | null>(null);
  const [pensando, setPensando] = useState(false);

  useEffect(() => {
    getCommand(locale).then(setC).catch(() => setC(null));
    setBullets(null);
    getAiSummary(locale).then((r) => { setBullets(r.bullets); setSrc(r.source); }).catch(() => setBullets([]));
    setRiesgo(null);
    getRiesgoAgentes(locale).then(setRiesgo).catch(() => setRiesgo([]));
  }, [locale]);

  async function preguntar(texto: string) {
    setPregunta(texto);
    setPensando(true);
    setRespuesta(await askAi(texto, locale).catch(() => ({ answer: "—", source: "error" })));
    setPensando(false);
  }
  const nivelLabel: Record<string, string> = { alto: dict.inicio.nivelAlto, medio: dict.inicio.nivelMedio, bajo: dict.inicio.nivelBajo };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <h1 className="mb-5 text-2xl font-bold text-ink">🧠 {dict.inicio.nav.iaInsights}</h1>

      {/* Recomendaciones + Resumen */}
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-brand to-brand-2 px-5 py-3"><h2 className="text-sm font-bold text-white">✦ {ci.iaFor} Cecilia</h2></div>
          <ul className="divide-y divide-line">
            {c?.recomendaciones.map((r, i) => (
              <li key={i} className="flex items-start gap-3 p-4">
                <ToneDot tone={r.tono} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{r.accion}</p>
                    <Badge tone={PRIO_TONE[r.prioridad] ?? "neutral"}>{ci.prio[r.prioridad as keyof typeof ci.prio] ?? r.prioridad}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{r.motivo}</p>
                </div>
              </li>
            ))}
            {c && c.recomendaciones.length === 0 && <li className="p-6 text-sm text-muted">{ci.noRecs}</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand">✦ {dict.inicio.execSummary}</h2>
            {src && <Badge tone={src === "ia" ? "ok" : "neutral"}>{src === "ia" ? dict.inicio.srcIa : dict.inicio.srcAuto}</Badge>}
          </div>
          <ul className="space-y-2.5">
            {(bullets ?? []).map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink2"><span className="mt-1.5"><ToneDot tone={b.tono} /></span><span>{b.texto}</span></li>
            ))}
            {bullets === null && <li className="text-sm text-muted">{dict.inicio.analyzing}</li>}
          </ul>
        </Card>
      </div>

      {/* Riesgo · Saturados · Oportunidades */}
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-warning"><ToneDot tone="warning" /> {g.iaRiesgo}</h2>
          <ul className="space-y-2 text-sm text-ink2">
            {c?.alertas.filter((a) => a.vip).map((a) => (
              <li key={a.id} className="flex items-center gap-2"><span>⚠️</span><span className="truncate">{a.cliente}</span></li>
            ))}
            {c && c.alertas.filter((a) => a.vip).length === 0 && <li className="text-faint">—</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-danger"><ToneDot tone="danger" /> {g.iaSaturados}</h2>
          <ul className="space-y-2 text-sm text-ink2">
            {c?.equipo.filter((e) => e.estado === "saturada").map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2"><span className="truncate">{e.nombre}</span><Badge tone="danger">{e.abiertas}</Badge></li>
            ))}
            {c && c.equipo.filter((e) => e.estado === "saturada").length === 0 && <li className="text-faint">—</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ok"><ToneDot tone="ok" /> {g.iaOpps}</h2>
          <ul className="space-y-2.5 text-sm">
            {c?.oportunidades.slice(0, 4).map((o) => (
              <li key={o.id}>
                <p className="truncate font-medium text-ink">{o.titulo}</p>
                <p className="flex items-center gap-2 text-xs text-muted">
                  {o.nivel && <Badge tone={NIVEL_TONE[o.nivel] ?? "neutral"}>{nivelLabel[o.nivel] ?? o.nivel}</Badge>}
                  {o.potencial > 0 && <span className="font-semibold text-ok">{money(o.potencial)}</span>}
                  <span>· {o.probabilidad}%</span>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Agentes en riesgo de abandono (actividad + onboarding + producción) */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex items-center gap-2 bg-gradient-to-r from-danger to-warning px-5 py-3">
          <h2 className="text-sm font-bold text-white">🚨 {g.iaAbandono}</h2>
        </div>
        <ul className="divide-y divide-line">
          {riesgo?.map((a) => (
            <li key={a.id} className="flex items-start gap-3 p-4">
              <ToneDot tone={a.tono} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">{a.nombre}</p>
                  <Badge tone={NIVEL_TONE[a.nivel] ?? "neutral"}>
                    {a.nivel === "alto" ? g.nivelAlto : g.nivelMedio}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {a.senales.map((s, i) => (
                    <span key={i} className="rounded-full bg-soft px-2 py-0.5 text-xs text-muted">{s}</span>
                  ))}
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold text-danger">{a.score}</span>
            </li>
          ))}
          {riesgo === null && <li className="p-6 text-sm text-muted">{dict.inicio.analyzing}</li>}
          {riesgo && riesgo.length === 0 && <li className="p-6 text-sm text-muted">{g.iaAbandonoEmpty}</li>}
        </ul>
      </Card>

      {/* Chat */}
      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">✦ {dict.inicio.askAi} <Badge tone="brand">BETA</Badge></h2>
        {respuesta && (
          <div className="mb-3 rounded-xl bg-brand-soft p-3 text-sm text-ink2">
            {respuesta.answer}
            <span className="mt-1 block text-xs text-faint">{respuesta.source === "ia" ? dict.inicio.answeredIa : dict.inicio.answeredAuto}</span>
          </div>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {dict.inicio.questions.map((p) => (
            <button key={p} onClick={() => preguntar(p)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:bg-soft">{p}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && preguntar(pregunta)}
            placeholder={dict.inicio.askPlaceholder} className="w-full rounded-lg bg-soft px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none" />
          <button onClick={() => preguntar(pregunta)} disabled={pensando} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-white disabled:opacity-50">{pensando ? "…" : "➤"}</button>
        </div>
      </Card>
    </div>
  );
}
