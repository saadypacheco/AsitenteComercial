"use client";

// REUNIONES que se procesan solas (Feature B): pegás la transcripción → la IA saca
// resumen + temas + acciones, y las acciones se crean como tareas de seguimiento.
import { useEffect, useState } from "react";

import { Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { getReuniones, procesarReunion, type ActaItem, type ProcResult } from "@/lib/queries/reuniones";

const EJEMPLO = `Cecilia: Buenos días equipo, arrancamos la reunión de líderes de la semana. El objetivo es mejorar la conversión de los nuevos agentes.
Juan: El grupo de Ventas Norte viene con buen ritmo, pero tenemos que reforzar el cierre.
Cecilia: Perfecto. Juan, hay que hacer seguimiento a los 3 clientes de seguro de vida que quedaron pendientes esta semana.
Ana: Yo tengo varios reclamos abiertos, queda pendiente revisar el caso de Toyota.
Cecilia: Bien, Ana, tenemos que coordinar una capacitación de manejo de objeciones para los nuevos; quedás como responsable de agendarla.
Cecilia: Como próximo paso, vamos a contactar a los clientes sin seguimiento antes del viernes. Luis, preparás la lista.
Cecilia: El compromiso de la semana es subir la asistencia a las formaciones al 90%.`;

export default function ReunionesPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.reuniones;

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("lideres");
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProcResult | null>(null);
  const [lista, setLista] = useState<ActaItem[]>([]);

  function reload() {
    getReuniones().then(setLista).catch(() => setLista([]));
  }
  useEffect(reload, []);

  async function procesar() {
    if (!titulo.trim() || !transcript.trim()) return;
    setBusy(true);
    setResult(null);
    const r = await procesarReunion({ titulo, tipo, transcripcion: transcript }, locale).catch(() => null);
    setResult(r);
    reload();
    setBusy(false);
  }

  const tipoLabel = (x: string) => (x === "formacion" ? t.tipoFormacion : x === "lideres" ? t.tipoLideres : t.tipoOtro);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <h1 className="text-2xl font-bold text-ink">{dict.inicio.nav.reuniones}</h1>
      <p className="mb-1 text-sm text-muted">{t.subtitle}</p>
      <p className="mb-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">⚠️ {t.simNote}</p>

      {/* Procesar */}
      <Card className="mb-5 p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={t.titulo}
            className="rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none" />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-line px-2 py-2 text-sm">
            <option value="lideres">{t.tipoLideres}</option>
            <option value="formacion">{t.tipoFormacion}</option>
            <option value="otro">{t.tipoOtro}</option>
          </select>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">{t.transcript}</span>
            <button onClick={() => { setTranscript(EJEMPLO); if (!titulo) setTitulo(locale === "es" ? "Reunión de líderes — semana" : "Leaders meeting — week"); }}
              className="text-xs font-semibold text-brand hover:underline">{t.useExample}</button>
          </div>
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={7} placeholder={t.placeholder}
            className="w-full resize-none rounded-lg border border-line bg-soft px-3 py-2 text-sm text-ink2 focus:border-brand focus:bg-white focus:outline-none" />
        </div>
        <button onClick={procesar} disabled={busy || !titulo.trim() || !transcript.trim()}
          className="mt-3 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-50">
          {busy ? t.processing : t.processBtn}
        </button>
      </Card>

      {/* Resultado */}
      {result && (
        <Card className="mb-5 overflow-hidden">
          <div className="bg-gradient-to-r from-brand to-brand-2 px-5 py-3"><h2 className="text-sm font-bold text-white">✦ {t.summary}</h2></div>
          <div className="space-y-4 p-5">
            <p className="text-sm text-ink2">{result.resumen}</p>
            {result.temas.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-brand">{t.topics}</h3>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">{result.temas.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand">✅ {t.actionsTitle} <span className="text-muted">({result.n_pendientes} {t.tasksCreated})</span></h3>
              <ul className="space-y-2">
                {result.acciones.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg border border-line bg-white p-2.5 text-sm">
                    <span className="text-ok">✓</span>
                    <span className="min-w-0">
                      <span className="block text-ink">{a.titulo}</span>
                      <span className="text-xs text-muted">{t.forWho}: {a.agente ?? t.unassigned}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Listado */}
      {lista.length === 0 ? (
        <Card className="px-4 py-12 text-center text-muted">{t.empty}</Card>
      ) : (
        <ul className="space-y-2">
          {lista.map((r) => (
            <li key={r.id}>
              <Card className="flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">📋</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{r.titulo}</p>
                  <p className="truncate text-xs text-muted">{r.resumen}</p>
                </div>
                <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
                  <Badge tone="brand">{tipoLabel(r.tipo)}</Badge>
                  <span className="text-muted">✅ {r.n_acciones}</span>
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
