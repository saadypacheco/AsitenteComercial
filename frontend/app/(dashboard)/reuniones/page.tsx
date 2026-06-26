"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/executive";
import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { getCapacitacionAsistencia, getProgramaCapacitacion, type AsistenciaAgente, type CapacitacionAsistencia, type Programa } from "@/lib/queries/gestion";
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

  // Selector de sesión + detalle de asistencia
  const [selectedSesionId, setSelectedSesionId] = useState<string | null>(null);
  const [asistencia, setAsistencia] = useState<CapacitacionAsistencia | null>(null);
  const [loadingAsistencia, setLoadingAsistencia] = useState(false);
  const [sortAsistencia, setSortAsistencia] = useState<"absent_first" | "present_first">("absent_first");

  // Filtro por sesión desde URL (e.g. /reuniones#asistencia o ?sesion=X)
  const [sesionHighlight, setSesionHighlight] = useState<string | null>(null);

  function reload() {
    getReuniones().then(setLista).catch(() => setLista([]));
  }

  useEffect(() => {
    reload();
    getProgramaCapacitacion(locale).then(setPrograma).catch(() => {});
    const p = new URLSearchParams(window.location.search);
    setSesionHighlight(p.get("sesion"));
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
  const totalAcciones = lista.reduce((s, r) => s + r.n_acciones, 0);
  const lastActa = lista[0] ?? null;

  // Sesiones del programa — todas las pasadas y futuras
  const now = new Date();
  const allSessions = (programa?.calendario ?? []).sort((a, b) =>
    new Date(a.fecha ?? "").getTime() - new Date(b.fecha ?? "").getTime()
  );
  const pastSessions = allSessions.filter((k) => k.fecha && new Date(k.fecha) < now);
  const totalAgentes = programa?.agentes.length ?? 0;

  // Asistencia promedio de sesiones pasadas
  const avgAttendance = pastSessions.length > 0
    ? Math.round(pastSessions.reduce((s, k) => s + (totalAgentes > 0 ? (k.asistentes / totalAgentes) * 100 : 0), 0) / pastSessions.length)
    : 0;

  // Filtro de actas
  const filteredLista = lista.filter((r) => {
    const matchTipo = filterTipo === "all" || r.tipo === filterTipo;
    const matchSearch = !filterSearch.trim() || r.titulo.toLowerCase().includes(filterSearch.toLowerCase());
    return matchTipo && matchSearch;
  });

  const fDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <h1 className="text-2xl font-bold text-ink">{dict.inicio.nav.reuniones}</h1>
      <p className="mb-4 text-sm text-muted">{t.subtitle}</p>

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
        <Card className={`border-t-[3px] p-4 ${avgAttendance >= 80 ? "border-t-ok" : avgAttendance >= 50 ? "border-t-warning" : "border-t-danger"}`}>
          <p className={`text-2xl font-bold ${avgAttendance >= 80 ? "text-ok" : avgAttendance >= 50 ? "text-warning" : "text-danger"}`}>
            {pastSessions.length > 0 ? `${avgAttendance}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">{es ? "Asistencia promedio" : "Avg. attendance"}</p>
        </Card>
      </div>

      {/* ── Sesiones del programa + detalle de asistencia ───────────────── */}
      {allSessions.length > 0 && (
        <Card className="mb-5 overflow-hidden p-0" id="asistencia">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand">
              📅 {es ? "Sesiones del programa" : "Program sessions"}
            </h2>
            <span className="text-xs text-muted">{es ? `${totalAgentes} agentes en total` : `${totalAgentes} agents total`}</span>
          </div>

          {/* Tabla de sesiones — clic en fila para ver detalle */}
          <div className="divide-y divide-line">
            {allSessions.map((k) => {
              const isPast = k.fecha && new Date(k.fecha) < now;
              const attendanceRate = totalAgentes > 0 ? Math.round((k.asistentes / totalAgentes) * 100) : 0;
              const absent = Math.max(0, totalAgentes - k.asistentes);
              const isSelected = selectedSesionId === k.id;
              return (
                <div key={k.id}>
                  <button
                    onClick={() => isPast ? selectSesion(k.id) : undefined}
                    className={`flex w-full items-center gap-4 px-5 py-3 text-left transition ${
                      isSelected ? "bg-brand-soft/40" : isPast ? "hover:bg-soft/60 cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {/* Date badge */}
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-center ${isSelected ? "bg-brand text-white" : "bg-soft"}`}>
                      <span className={`text-[10px] font-bold leading-tight ${isSelected ? "text-white" : "text-muted"}`}>
                        {fDate(k.fecha).slice(0, 6)}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${isSelected ? "text-brand" : "text-ink"}`}>{k.nombre}</p>
                      <p className="text-[11px] text-faint">{fDate(k.fecha)}</p>
                    </div>

                    {/* Attendance bar */}
                    {isPast ? (
                      <div className="w-28 shrink-0">
                        <div className="mb-1 flex items-center justify-between text-[10px] text-muted">
                          <span>{k.asistentes}/{totalAgentes}</span>
                          <span className={attendanceRate >= 80 ? "text-ok" : attendanceRate >= 50 ? "text-warning" : "text-danger"}>
                            {attendanceRate}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-soft">
                          <div
                            className={`h-full rounded-full ${attendanceRate >= 80 ? "bg-ok" : attendanceRate >= 50 ? "bg-warning" : "bg-danger"}`}
                            style={{ width: `${attendanceRate}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="w-28 shrink-0 text-right">
                        <span className="text-xs text-faint">{es ? "Programada" : "Scheduled"}</span>
                      </div>
                    )}

                    {/* Absent pill + chevron */}
                    {isPast && (
                      <div className="flex w-24 shrink-0 items-center justify-end gap-2">
                        {absent > 0 ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-danger">
                            ✗ {absent} {es ? "faltó" : "absent"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-ok">
                            ✓ {es ? "Todos" : "All"}
                          </span>
                        )}
                        <span className={`text-xs text-muted transition-transform ${isSelected ? "rotate-90" : ""}`}>›</span>
                      </div>
                    )}
                  </button>

                  {/* Panel de detalle de asistencia inline */}
                  {isSelected && (
                    <div className="border-t border-brand/20 bg-soft/30 px-5 py-4" id="asistencia-detalle">
                      {/* Header del detalle */}
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-ink">{k.nombre}</p>
                          <p className="text-xs text-muted">{fDate(k.fecha)}</p>
                        </div>
                        {/* Sort toggle */}
                        <div className="flex rounded-lg border border-line bg-white overflow-hidden text-xs">
                          <button
                            onClick={() => setSortAsistencia("absent_first")}
                            className={`px-3 py-1.5 font-medium transition ${sortAsistencia === "absent_first" ? "bg-brand text-white" : "text-muted hover:bg-soft"}`}
                          >
                            {es ? "Faltaron primero" : "Absent first"}
                          </button>
                          <button
                            onClick={() => setSortAsistencia("present_first")}
                            className={`px-3 py-1.5 font-medium transition ${sortAsistencia === "present_first" ? "bg-brand text-white" : "text-muted hover:bg-soft"}`}
                          >
                            {es ? "Asistieron primero" : "Present first"}
                          </button>
                        </div>
                      </div>

                      {loadingAsistencia && (
                        <p className="py-4 text-center text-sm text-muted">{es ? "Cargando…" : "Loading…"}</p>
                      )}

                      {asistencia && (() => {
                        const sorted = [...asistencia.agentes].sort((a, b) => {
                          if (sortAsistencia === "absent_first") return (a.asistio ? 1 : 0) - (b.asistio ? 1 : 0);
                          return (b.asistio ? 1 : 0) - (a.asistio ? 1 : 0);
                        });
                        const presentes = asistencia.agentes.filter((a) => a.asistio).length;
                        const ausentes = asistencia.agentes.length - presentes;
                        return (
                          <>
                            {/* Resumen */}
                            <div className="mb-3 flex gap-3 text-xs">
                              <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 font-semibold text-ok">
                                ✓ {presentes} {es ? "asistieron" : "attended"}
                              </span>
                              <span className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 font-semibold text-danger">
                                ✗ {ausentes} {es ? "faltaron" : "absent"}
                              </span>
                            </div>

                            {/* Lista de agentes */}
                            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                              {sorted.map((ag) => (
                                <div key={ag.id} className={`flex items-center gap-3 px-4 py-2.5 ${!ag.asistio ? "bg-red-50/40" : ""}`}>
                                  {/* Status icon */}
                                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${ag.asistio ? "bg-green-100 text-ok" : "bg-red-100 text-danger"}`}>
                                    {ag.asistio ? "✓" : "✗"}
                                  </span>

                                  {/* Name */}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink">
                                      {ag.nombre} {ag.apellido ?? ""}
                                    </p>
                                    {ag.email && <p className="truncate text-[11px] text-muted">{ag.email}</p>}
                                  </div>

                                  {/* Status badge */}
                                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ag.asistio ? "bg-green-50 text-ok" : "bg-red-50 text-danger"}`}>
                                    {ag.asistio ? (es ? "Asistió" : "Attended") : (es ? "Faltó" : "Absent")}
                                  </span>

                                  {/* Call button for absent agents */}
                                  {!ag.asistio && ag.celular && (
                                    <a href={`tel:${ag.celular}`}
                                      className="shrink-0 rounded-lg bg-warning px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90">
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
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Procesar transcripción ────────────────────────────────────────── */}
      <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">⚠️ {t.simNote}</p>
      <Card className="mb-5 p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand">
          🎙️ {es ? "Procesar transcripción" : "Process transcript"}
        </h2>
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

      {/* ── Historial de actas ────────────────────────────────────────────── */}
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
              <button onClick={() => setFilterSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">✕</button>
            )}
          </div>
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}
            className="rounded-lg border border-line bg-soft py-1.5 pl-2 pr-6 text-xs text-ink focus:border-brand focus:outline-none">
            <option value="all">{es ? "Todos" : "All"}</option>
            <option value="lideres">{t.tipoLideres}</option>
            <option value="formacion">{t.tipoFormacion}</option>
            <option value="otro">{t.tipoOtro}</option>
          </select>
        </div>
      </div>

      {filteredLista.length === 0 ? (
        <Card className="px-4 py-12 text-center text-muted">
          {lista.length === 0 ? t.empty : (es ? "Sin resultados para ese filtro" : "No results for this filter")}
        </Card>
      ) : (
        <ul className="space-y-2">
          {filteredLista.map((r) => (
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
                  {r.fecha && <span className="text-faint">{fDate(r.fecha)}</span>}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
