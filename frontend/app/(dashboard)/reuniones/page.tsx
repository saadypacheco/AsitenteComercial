"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import {
  getCapacitacionAsistencia,
  getProgramaCapacitacion,
  type AsistenciaAgente,
  type CapacitacionAsistencia,
  type Programa,
} from "@/lib/queries/gestion";
import {
  difundirReunion,
  getReunion,
  getReuniones,
  getReunionsPendientesDifusion,
  patchReunion,
  procesarReunion,
  type Acta,
  type ActaItem,
  type ProcResult,
} from "@/lib/queries/reuniones";

const EJEMPLO = `Cecilia: Buenos días equipo, arrancamos la reunión de líderes de la semana. El objetivo es mejorar la conversión de los nuevos agentes.
Juan: El grupo de Ventas Norte viene con buen ritmo, pero tenemos que reforzar el cierre.
Cecilia: Perfecto. Juan, hay que hacer seguimiento a los 3 clientes de seguro de vida que quedaron pendientes esta semana.
Ana: Yo tengo varios reclamos abiertos, queda pendiente revisar el caso de Toyota.
Cecilia: Bien, Ana, tenemos que coordinar una capacitación de manejo de objeciones para los nuevos; quedás como responsable de agendarla.
Cecilia: Como próximo paso, vamos a contactar a los clientes sin seguimiento antes del viernes. Luis, preparás la lista.
Cecilia: El compromiso de la semana es subir la asistencia a las formaciones al 90%.`;

// ── Expandable acta card ──────────────────────────────────────────────────────
function ActaCard({
  item,
  allSessions,
  totalAgentes,
  es,
  fDate,
  tipoLabel,
  onSent,
}: {
  item: ActaItem;
  allSessions: { id: string; nombre: string; fecha: string | null }[];
  totalAgentes: number;
  es: boolean;
  fDate: (s: string | null) => string;
  tipoLabel: (x: string) => string;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Acta | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editingResumen, setEditingResumen] = useState(false);
  const [resumenDraft, setResumenDraft] = useState("");
  const [savingResumen, setSavingResumen] = useState(false);
  const [difundiendo, setDifundiendo] = useState(false);
  const [estadoDifusion, setEstadoDifusion] = useState(item.estado_difusion);
  const [enviado_a, setEnviadoA] = useState<number | null>(null);

  async function toggleOpen() {
    if (!open && !detail) {
      setLoadingDetail(true);
      const d = await getReunion(item.id).catch(() => null);
      setDetail(d);
      if (d) setResumenDraft(d.resumen_aprobado ?? d.resumen ?? "");
      setLoadingDetail(false);
    }
    setOpen((v) => !v);
  }

  async function saveResumen() {
    if (!detail) return;
    setSavingResumen(true);
    await patchReunion(item.id, { resumen_aprobado: resumenDraft }).catch(() => {});
    setDetail((d) => d ? { ...d, resumen_aprobado: resumenDraft } : d);
    setEditingResumen(false);
    setSavingResumen(false);
  }

  async function difundir() {
    if (!confirm(es ? "¿Enviar el resumen a todos los agentes y líderes?" : "Send summary to all agents and leaders?")) return;
    setDifundiendo(true);
    const r = await difundirReunion(item.id).catch(() => null);
    if (r) {
      setEstadoDifusion("enviado");
      setEnviadoA(r.enviado_a);
      onSent();
    }
    setDifundiendo(false);
  }

  const isSent = estadoDifusion === "enviado";
  const resumenMostrado = detail?.resumen_aprobado ?? detail?.resumen;
  const horasDesdeCreacion = detail
    ? (Date.now() - new Date(detail.created_at).getTime()) / 3600000
    : 0;
  const alertaPendiente = !isSent && horasDesdeCreacion > 2;

  return (
    <li>
      <Card className={`overflow-hidden transition ${alertaPendiente ? "ring-2 ring-warning/60" : ""}`}>
        {/* Header row — always visible */}
        <button
          onClick={toggleOpen}
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand text-lg">📋</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-ink truncate">{item.titulo}</p>
              {alertaPendiente && (
                <span className="shrink-0 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-white">
                  ⚠ {es ? "Sin enviar" : "Not sent"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted truncate">{item.resumen ?? ""}</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <Badge tone={isSent ? "ok" : "warning"}>
              {isSent ? (es ? "Enviado" : "Sent") : (es ? "Pendiente" : "Pending")}
            </Badge>
            <Badge tone="brand">{tipoLabel(item.tipo)}</Badge>
            <span className="text-[11px] text-muted">✅ {item.n_acciones}</span>
            {item.fecha && <span className="text-[10px] text-faint">{fDate(item.fecha)}</span>}
          </div>
          <span className="ml-1 text-muted shrink-0">{open ? "▲" : "▼"}</span>
        </button>

        {/* Expanded content */}
        {open && (
          <div className="border-t border-line bg-soft/30 px-5 pb-5 pt-4 space-y-4">
            {loadingDetail && (
              <p className="text-sm text-muted text-center py-4">{es ? "Cargando…" : "Loading…"}</p>
            )}

            {detail && (
              <>
                {/* Vincular sesión */}
                <div>
                  <label className="block mb-1 text-xs font-bold uppercase tracking-wide text-muted">
                    {es ? "Sesión del programa" : "Program session"}
                  </label>
                  <select
                    defaultValue={detail.capacitacion_id ?? ""}
                    onChange={async (e) => {
                      const val = e.target.value || undefined;
                      await patchReunion(item.id, { capacitacion_id: val ?? "" }).catch(() => {});
                    }}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  >
                    <option value="">{es ? "— Sin vincular —" : "— Not linked —"}</option>
                    {allSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {fDate(s.fecha)} — {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resumen editable */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted">
                      {es ? "Resumen para difundir" : "Summary to broadcast"}
                    </label>
                    {!editingResumen && (
                      <button
                        onClick={() => { setResumenDraft(resumenMostrado ?? ""); setEditingResumen(true); }}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        ✏️ {es ? "Editar" : "Edit"}
                      </button>
                    )}
                  </div>
                  {editingResumen ? (
                    <div>
                      <textarea
                        value={resumenDraft}
                        onChange={(e) => setResumenDraft(e.target.value)}
                        rows={5}
                        className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={saveResumen}
                          disabled={savingResumen}
                          className="rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {savingResumen ? (es ? "Guardando…" : "Saving…") : (es ? "Guardar" : "Save")}
                        </button>
                        <button
                          onClick={() => setEditingResumen(false)}
                          className="rounded-lg border border-line px-4 py-1.5 text-xs font-semibold text-muted hover:bg-white"
                        >
                          {es ? "Cancelar" : "Cancel"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink2 whitespace-pre-wrap">
                      {resumenMostrado || <span className="text-faint italic">{es ? "Sin resumen aún" : "No summary yet"}</span>}
                    </div>
                  )}
                </div>

                {/* Temas */}
                {detail.temas && detail.temas.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{es ? "Temas" : "Topics"}</p>
                    <ul className="list-disc pl-5 space-y-0.5 text-sm text-ink2">
                      {detail.temas.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                )}

                {/* Acciones */}
                {detail.acciones && detail.acciones.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                      {es ? "Acciones generadas" : "Generated actions"} ({detail.acciones.length})
                    </p>
                    <ul className="space-y-1.5">
                      {detail.acciones.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 rounded-lg border border-line bg-white p-2 text-xs">
                          <span className="text-ok mt-0.5">✓</span>
                          <span>
                            <span className="block text-ink font-medium">{a.titulo}</span>
                            <span className="text-muted">{a.agente ?? (es ? "Sin asignar" : "Unassigned")}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Transcripción (colapsada) */}
                {detail.transcripcion && (
                  <details className="rounded-lg border border-line bg-white">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted hover:text-ink">
                      📄 {es ? "Ver transcripción completa" : "View full transcript"}
                    </summary>
                    <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap px-3 pb-3 pt-1 text-xs text-ink2 font-sans">
                      {detail.transcripcion}
                    </pre>
                  </details>
                )}

                {/* Botón difundir / estado enviado */}
                <div className="pt-1">
                  {isSent ? (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                      <span className="text-ok font-bold">✓</span>
                      <span className="text-sm text-ok font-semibold">
                        {es
                          ? `Resumen enviado a ${enviado_a ?? "todos"} destinatarios`
                          : `Summary sent to ${enviado_a ?? "all"} recipients`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={difundir}
                        disabled={difundiendo || editingResumen}
                        className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-50 hover:opacity-90"
                      >
                        📣 {difundiendo ? (es ? "Enviando…" : "Sending…") : (es ? "Aprobar y Enviar a todos" : "Approve & Send to all")}
                      </button>
                      {alertaPendiente && (
                        <p className="text-xs text-warning font-medium">
                          ⚠ {es ? "Hace más de 2 hs que no se difundió" : "Not broadcast for 2+ hours"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </li>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReunionesPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.reuniones;
  const es = locale === "es";

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("lideres");
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProcResult | null>(null);
  const [lista, setLista] = useState<ActaItem[]>([]);
  const [programa, setPrograma] = useState<Programa | null>(null);
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [pendientesDifusion, setPendientesDifusion] = useState<ActaItem[]>([]);

  // Selector de sesión + detalle de asistencia
  const [selectedSesionId, setSelectedSesionId] = useState<string | null>(null);
  const [asistencia, setAsistencia] = useState<CapacitacionAsistencia | null>(null);
  const [loadingAsistencia, setLoadingAsistencia] = useState(false);
  const [sortAsistencia, setSortAsistencia] = useState<"absent_first" | "present_first">("absent_first");

  function reload() {
    getReuniones().then(setLista).catch(() => setLista([]));
    getReunionsPendientesDifusion().then(setPendientesDifusion).catch(() => setPendientesDifusion([]));
  }

  useEffect(() => {
    reload();
    getProgramaCapacitacion(locale).then(setPrograma).catch(() => {});
    const p = new URLSearchParams(window.location.search);
    const sesionParam = p.get("sesion");
    if (sesionParam) {
      setSelectedSesionId(sesionParam);
      loadAsistencia(sesionParam);
    }
    if (window.location.hash === "#asistencia") {
      setTimeout(() => {
        document.getElementById("asistencia")?.scrollIntoView({ behavior: "smooth" });
      }, 400);
    }
  }, [locale]);

  async function loadAsistencia(cid: string) {
    setLoadingAsistencia(true);
    setAsistencia(null);
    const data = await getCapacitacionAsistencia(cid).catch(() => null);
    setAsistencia(data);
    setLoadingAsistencia(false);
  }

  function selectSesion(id: string) {
    if (selectedSesionId === id) {
      setSelectedSesionId(null);
      setAsistencia(null);
      return;
    }
    setSelectedSesionId(id);
    loadAsistencia(id);
    setTimeout(() => {
      document.getElementById("asistencia-detalle")?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  }

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

  // Stats de actas procesadas
  const totalActas = lista.length;
  const totalAcciones = lista.reduce((s, r) => s + (r.n_acciones ?? 0), 0);

  // Sesiones del programa
  const now = new Date();
  const allSessions = (programa?.calendario ?? []).sort((a, b) =>
    new Date(a.fecha ?? "").getTime() - new Date(b.fecha ?? "").getTime()
  );
  const pastSessions = allSessions.filter((k) => k.fecha && new Date(k.fecha) < now);
  const totalAgentes = programa?.agentes.length ?? 0;

  const avgAttendance =
    pastSessions.length > 0
      ? Math.round(
          pastSessions.reduce((s, k) => s + (totalAgentes > 0 ? (k.asistentes / totalAgentes) * 100 : 0), 0) /
            pastSessions.length
        )
      : 0;

  const filteredLista = lista.filter((r) => {
    const matchTipo = filterTipo === "all" || r.tipo === filterTipo;
    const matchSearch = !filterSearch.trim() || r.titulo.toLowerCase().includes(filterSearch.toLowerCase());
    return matchTipo && matchSearch;
  });

  const fDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const last5 = pastSessions.slice(-5);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">

      {/* ── Header: título + últimas 5 sesiones ──────────────────────────── */}
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink">{dict.inicio.nav.reuniones}</h1>
            {pendientesDifusion.length > 0 && (
              <span className="rounded-full bg-warning px-2.5 py-0.5 text-xs font-bold text-white">
                ⚠ {pendientesDifusion.length}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted">{t.subtitle}</p>
        </div>

        {last5.length > 0 && (
          <div className="w-full overflow-x-auto lg:max-w-[520px]">
            <ol className="flex min-w-max items-start gap-1">
              {last5.map((k, i) => {
                const rate = totalAgentes > 0 ? Math.round((k.asistentes / totalAgentes) * 100) : 0;
                const allPresent = k.asistentes >= totalAgentes;
                const isSelected = selectedSesionId === k.id;
                return (
                  <li key={k.id} className="flex items-center">
                    {i > 0 && <span className="mx-1 h-px w-5 shrink-0 bg-line" />}
                    <button
                      onClick={() => {
                        setSelectedSesionId(k.id);
                        loadAsistencia(k.id);
                        setTimeout(
                          () => document.getElementById("asistencia")?.scrollIntoView({ behavior: "smooth" }),
                          200
                        );
                      }}
                      className="flex flex-col items-center text-center"
                      style={{ minWidth: 72 }}
                    >
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition ${
                          isSelected
                            ? "bg-brand text-white ring-2 ring-brand ring-offset-1"
                            : allPresent
                            ? "bg-ok text-white"
                            : rate >= 50
                            ? "bg-warning text-white"
                            : "bg-danger text-white"
                        }`}
                      >
                        {allPresent ? "✓" : `${rate}%`}
                      </span>
                      <p className="mt-1 max-w-[72px] text-[10px] font-medium leading-tight text-ink">{k.nombre}</p>
                      <p className="text-[10px] text-faint">{fDate(k.fecha).slice(0, 6)}</p>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </header>

      {/* ── Alerta pendientes difusión ──────────────────────────────────── */}
      {pendientesDifusion.length > 0 && (
        <div className="mb-5 rounded-xl border border-warning/40 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <span className="text-warning text-xl shrink-0">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {es
                ? `${pendientesDifusion.length} reunión${pendientesDifusion.length > 1 ? "es" : ""} sin difundir (hace más de 2 hs)`
                : `${pendientesDifusion.length} meeting${pendientesDifusion.length > 1 ? "s" : ""} not broadcast yet (2+ hours ago)`}
            </p>
            <ul className="mt-1 space-y-0.5">
              {pendientesDifusion.map((r) => (
                <li key={r.id} className="text-xs text-amber-700">
                  · {r.titulo}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-t-[3px] border-t-brand p-4">
          <p className="text-2xl font-bold text-brand">{totalActas}</p>
          <p className="mt-1 text-xs text-muted">{es ? "Actas procesadas" : "Processed minutes"}</p>
        </Card>
        <Card className="border-t-[3px] border-t-ok p-4">
          <p className="text-2xl font-bold text-ok">{totalAcciones}</p>
          <p className="mt-1 text-xs text-muted">{es ? "Acciones generadas" : "Actions generated"}</p>
        </Card>
        <Card className="border-t-[3px] border-t-warning p-4">
          <p className="text-2xl font-bold text-warning">{pastSessions.length}</p>
          <p className="mt-1 text-xs text-muted">{es ? "Sesiones realizadas" : "Sessions held"}</p>
        </Card>
        <Card
          className={`border-t-[3px] p-4 ${
            avgAttendance >= 80 ? "border-t-ok" : avgAttendance >= 50 ? "border-t-warning" : "border-t-danger"
          }`}
        >
          <p
            className={`text-2xl font-bold ${
              avgAttendance >= 80 ? "text-ok" : avgAttendance >= 50 ? "text-warning" : "text-danger"
            }`}
          >
            {pastSessions.length > 0 ? `${avgAttendance}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">{es ? "Asistencia promedio" : "Avg. attendance"}</p>
        </Card>
      </div>

      {/* ── Sesiones del programa + detalle de asistencia ───────────────── */}
      {allSessions.length > 0 && (
        <Card className="mb-5 overflow-hidden p-0" id="asistencia">
          <div className="border-b border-line px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-brand">
                📅 {es ? "Sesiones del programa" : "Program sessions"}
              </h2>
              <span className="text-xs text-muted">
                {es
                  ? `${totalAgentes} agentes · ${pastSessions.length} realizadas`
                  : `${totalAgentes} agents · ${pastSessions.length} held`}
              </span>
            </div>
            <div className="relative">
              <select
                value={selectedSesionId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setSelectedSesionId(null);
                    setAsistencia(null);
                    return;
                  }
                  setSelectedSesionId(val);
                  loadAsistencia(val);
                }}
                className="w-full appearance-none rounded-xl border border-line bg-soft py-2.5 pl-4 pr-10 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              >
                <option value="">
                  {es ? "— Seleccioná una sesión realizada —" : "— Select a completed session —"}
                </option>
                {pastSessions.map((k) => {
                  const absent = Math.max(0, totalAgentes - k.asistentes);
                  const absentLabel =
                    absent > 0
                      ? ` · ${absent} ${es ? "faltó" : "absent"}`
                      : ` · ${es ? "todos" : "all present"}`;
                  return (
                    <option key={k.id} value={k.id}>
                      {fDate(k.fecha)} — {k.nombre}
                      {absentLabel}
                    </option>
                  );
                })}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">▾</span>
            </div>
          </div>

          {selectedSesionId &&
            (() => {
              const sesion = allSessions.find((k) => k.id === selectedSesionId);
              return (
                <div className="px-5 py-4" id="asistencia-detalle">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-bold text-ink">{sesion?.nombre}</p>
                      <p className="text-xs text-muted">{fDate(sesion?.fecha ?? null)}</p>
                    </div>
                    <div className="flex overflow-hidden rounded-lg border border-line bg-white text-xs">
                      <button
                        onClick={() => setSortAsistencia("absent_first")}
                        className={`px-3 py-1.5 font-medium transition ${
                          sortAsistencia === "absent_first" ? "bg-brand text-white" : "text-muted hover:bg-soft"
                        }`}
                      >
                        {es ? "Faltaron primero" : "Absent first"}
                      </button>
                      <button
                        onClick={() => setSortAsistencia("present_first")}
                        className={`px-3 py-1.5 font-medium transition ${
                          sortAsistencia === "present_first" ? "bg-brand text-white" : "text-muted hover:bg-soft"
                        }`}
                      >
                        {es ? "Asistieron primero" : "Present first"}
                      </button>
                    </div>
                  </div>

                  {loadingAsistencia && (
                    <p className="py-6 text-center text-sm text-muted">{es ? "Cargando…" : "Loading…"}</p>
                  )}

                  {asistencia &&
                    (() => {
                      const sorted = [...asistencia.agentes].sort((a, b) => {
                        if (sortAsistencia === "absent_first") return (a.asistio ? 1 : 0) - (b.asistio ? 1 : 0);
                        return (b.asistio ? 1 : 0) - (a.asistio ? 1 : 0);
                      });
                      const presentes = asistencia.agentes.filter((a) => a.asistio).length;
                      const ausentes = asistencia.agentes.length - presentes;
                      return (
                        <>
                          <div className="mb-3 flex gap-2 text-xs">
                            <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 font-semibold text-ok">
                              ✓ {presentes} {es ? "asistieron" : "attended"}
                            </span>
                            <span className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 font-semibold text-danger">
                              ✗ {ausentes} {es ? "faltaron" : "absent"}
                            </span>
                          </div>
                          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                            {sorted.map((ag) => (
                              <div
                                key={ag.id}
                                className={`flex items-center gap-3 px-4 py-2.5 ${!ag.asistio ? "bg-red-50/30" : ""}`}
                              >
                                <span
                                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                                    ag.asistio ? "bg-green-100 text-ok" : "bg-red-100 text-danger"
                                  }`}
                                >
                                  {ag.asistio ? "✓" : "✗"}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-ink">
                                    {ag.nombre} {ag.apellido ?? ""}
                                  </p>
                                  {ag.email && <p className="truncate text-[11px] text-muted">{ag.email}</p>}
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                    ag.asistio ? "bg-green-50 text-ok" : "bg-red-50 text-danger"
                                  }`}
                                >
                                  {ag.asistio ? (es ? "Asistió" : "Attended") : es ? "Faltó" : "Absent"}
                                </span>
                                {!ag.asistio && ag.celular && (
                                  <a
                                    href={`tel:${ag.celular}`}
                                    className="shrink-0 rounded-lg bg-warning px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90"
                                  >
                                    📞 {es ? "Llamar" : "Call"}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                </div>
              );
            })()}

          {!selectedSesionId && (
            <div className="px-5 py-8 text-center text-sm text-muted">
              {es
                ? "Seleccioná una sesión para ver quiénes asistieron y quiénes faltaron."
                : "Select a session to see who attended and who was absent."}
            </div>
          )}
        </Card>
      )}

      {/* ── Procesar transcripción ────────────────────────────────────────── */}
      <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">⚠️ {t.simNote}</p>
      <Card className="mb-5 p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">
          🎙️ {es ? "Procesar transcripción" : "Process transcript"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={t.titulo}
            className="rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="rounded-lg border border-line px-2 py-2 text-sm"
          >
            <option value="lideres">{t.tipoLideres}</option>
            <option value="formacion">{t.tipoFormacion}</option>
            <option value="otro">{t.tipoOtro}</option>
          </select>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">{t.transcript}</span>
            <button
              onClick={() => {
                setTranscript(EJEMPLO);
                if (!titulo) setTitulo(locale === "es" ? "Reunión de líderes — semana" : "Leaders meeting — week");
              }}
              className="text-xs font-semibold text-brand hover:underline"
            >
              {t.useExample}
            </button>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={7}
            placeholder={t.placeholder}
            className="w-full resize-none rounded-lg border border-line bg-soft px-3 py-2 text-sm text-ink2 focus:border-brand focus:bg-white focus:outline-none"
          />
        </div>
        <button
          onClick={procesar}
          disabled={busy || !titulo.trim() || !transcript.trim()}
          className="mt-3 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-50"
        >
          {busy ? t.processing : t.processBtn}
        </button>
      </Card>

      {result && (
        <Card className="mb-5 overflow-hidden">
          <div className="bg-gradient-to-r from-brand to-brand-2 px-5 py-3">
            <h2 className="text-sm font-bold text-white">✦ {t.summary}</h2>
          </div>
          <div className="space-y-4 p-5">
            <p className="text-sm text-ink2">{result.resumen}</p>
            {result.temas.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-brand">{t.topics}</h3>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">
                  {result.temas.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand">
                ✅ {t.actionsTitle}{" "}
                <span className="text-muted">
                  ({result.n_pendientes} {t.tasksCreated})
                </span>
              </h3>
              <ul className="space-y-2">
                {result.acciones.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg border border-line bg-white p-2.5 text-sm">
                    <span className="text-ok">✓</span>
                    <span className="min-w-0">
                      <span className="block text-ink">{a.titulo}</span>
                      <span className="text-xs text-muted">
                        {t.forWho}: {a.agente ?? t.unassigned}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* ── Historial de reuniones ────────────────────────────────────────── */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand">
          📋 {es ? "Historial de reuniones" : "Meeting history"}
        </h2>
        <div className="flex gap-2">
          <div className="relative">
            <input
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder={es ? "Buscar…" : "Search…"}
              className="w-36 rounded-lg border border-line bg-soft py-1.5 pl-3 pr-7 text-xs text-ink focus:border-brand focus:outline-none"
            />
            {filterSearch && (
              <button
                onClick={() => setFilterSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="rounded-lg border border-line bg-soft py-1.5 pl-2 pr-6 text-xs text-ink focus:border-brand focus:outline-none"
          >
            <option value="all">{es ? "Todos" : "All"}</option>
            <option value="lideres">{t.tipoLideres}</option>
            <option value="formacion">{t.tipoFormacion}</option>
            <option value="otro">{t.tipoOtro}</option>
          </select>
        </div>
      </div>

      {filteredLista.length === 0 ? (
        <Card className="px-4 py-12 text-center text-muted">
          {lista.length === 0
            ? t.empty
            : es
            ? "Sin resultados para ese filtro"
            : "No results for this filter"}
        </Card>
      ) : (
        <ul className="space-y-2">
          {filteredLista.map((r) => (
            <ActaCard
              key={r.id}
              item={r}
              allSessions={allSessions}
              totalAgentes={totalAgentes}
              es={es}
              fDate={fDate}
              tipoLabel={tipoLabel}
              onSent={reload}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
