// Lecturas/escrituras de gestión (rebanada F-002) vía authFetch (Bearer + tenant).
import { authFetch } from "@/lib/auth";

export type AgenteOption = { id: string; nombre: string; apellido: string | null; estado: string };

export type Pendiente = {
  id: string;
  titulo: string;
  cliente: string | null;
  vip: boolean;
  horas: number;
  tipo: string;
  prioridad: "critico" | "alto" | "medio" | "bajo";
  estado: "pendiente" | "en_proceso" | "cerrado";
  created_at: string;
  fecha_cierre: string | null;
  agente_id: string | null;
  agente: string | null;
};

export type PendientesResp = {
  progreso: { cerrados: number; abiertos: number; criticos: number; sin_asignar: number; total: number; pct: number };
  items: Pendiente[];
};

export async function getAgentesOptions(): Promise<AgenteOption[]> {
  const res = await authFetch("/gestion/agentes");
  if (!res.ok) throw new Error(`agentes: ${res.status}`);
  return res.json();
}

export type Agente = {
  id: string;
  nombre: string;
  apellido: string | null;
  celular: string | null;
  email: string | null;
  estado: "activo" | "inactivo" | "baja";
  ciudad: string | null;
  region: string | null;
  idioma: string | null;
  superior_id: string | null;
  superior: string | null;
  lat: number | null;
  lng: number | null;
  abiertas: number;
  cerrados: number;
  es_lider: boolean;
  // Campos enriquecidos — asistencia
  sesiones_registradas: number;
  sesiones_asistidas: number;
  sesiones_faltadas: number;
  ultima_sesion_fecha: string | null;
  pct_onboarding: number;
  etapa_actual: string | null;
  // Campos enriquecidos — simulador
  total_simulaciones: number;
  puntaje_simulador: number | null;
  escenario_favorito: string | null;
  // Cuenta de acceso
  tiene_usuario: boolean;
  usuario_activo: boolean;
};

export type AgenteInput = {
  nombre: string;
  apellido?: string | null;
  celular?: string | null;
  email?: string | null;
  ciudad?: string | null;
  region?: string | null;
  superior_id?: string | null;
  estado?: string;
  lat?: number | null;
  lng?: number | null;
};

export async function getAgentes(): Promise<Agente[]> {
  const res = await authFetch("/gestion/agentes");
  if (!res.ok) throw new Error(`agentes: ${res.status}`);
  return res.json();
}

export async function createAgente(body: AgenteInput): Promise<void> {
  const res = await authFetch("/gestion/agentes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`crear agente: ${res.status}`);
}

export async function updateAgente(id: string, body: AgenteInput): Promise<void> {
  const res = await authFetch(`/gestion/agentes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`editar agente: ${res.status}`);
}

export async function bajaAgente(id: string): Promise<void> {
  const res = await authFetch(`/gestion/agentes/${id}/baja`, { method: "POST" });
  if (!res.ok) throw new Error(`baja agente: ${res.status}`);
}

export async function designarLider(id: string): Promise<{ email: string }> {
  const res = await authFetch(`/gestion/agentes/${id}/lider`, { method: "POST" });
  if (!res.ok) throw new Error(`designar líder: ${res.status}`);
  return res.json();
}

export async function quitarLider(id: string): Promise<void> {
  const res = await authFetch(`/gestion/agentes/${id}/lider`, { method: "DELETE" });
  if (!res.ok) throw new Error(`quitar líder: ${res.status}`);
}

export async function activarUsuarioAgente(id: string): Promise<{ ok: boolean; email: string; link?: string }> {
  const res = await authFetch(`/gestion/agentes/${id}/usuario`, { method: "POST" });
  if (!res.ok) throw new Error(`activar usuario: ${res.status}`);
  return res.json();
}

export async function toggleUsuarioAgente(id: string, activo: boolean): Promise<void> {
  const res = await authFetch(`/gestion/agentes/${id}/usuario`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activo }),
  });
  if (!res.ok) throw new Error(`toggle usuario: ${res.status}`);
}

// ── Grupos · Eventos · Capacitaciones ────────────────────────────────────────
export type Grupo = {
  id: string;
  nombre: string | null;
  tipo: string;
  mensajes_7d: number;
  mensajes_total: number;
  ultimo: string | null;
};

export type Evento = {
  id: string;
  tipo: string;
  status: "open" | "in_progress" | "done" | "dismissed";
  titulo: string | null;
  detalle: string | null;
  nivel: string | null;
  probabilidad: number;
  potencial: number;
  created_at: string;
};

export type Capacitacion = {
  id: string;
  nombre: string;
  estado: "programada" | "en_curso" | "finalizada" | "cancelada";
  fecha: string | null;
  instructor: string | null;
  asistentes: number;
};

export async function getGrupos(lang = "es"): Promise<Grupo[]> {
  const res = await authFetch(`/gestion/grupos?lang=${lang}`);
  if (!res.ok) throw new Error(`grupos: ${res.status}`);
  return res.json();
}

export async function getEventos(lang = "es"): Promise<Evento[]> {
  const res = await authFetch(`/gestion/eventos?lang=${lang}`);
  if (!res.ok) throw new Error(`eventos: ${res.status}`);
  return res.json();
}

export async function updateEventoStatus(id: string, status: string): Promise<void> {
  const res = await authFetch(`/gestion/eventos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`evento: ${res.status}`);
}

export async function getCapacitaciones(lang = "es"): Promise<Capacitacion[]> {
  const res = await authFetch(`/gestion/capacitaciones?lang=${lang}`);
  if (!res.ok) throw new Error(`capacitaciones: ${res.status}`);
  return res.json();
}

export type Programa = {
  programa: { nombre: string; total_etapas: number };
  progreso: { completados: number; total: number; pct: number };
  etapas: { id: string; nombre: string; descripcion: string | null; orden: number; completados: number; en_curso: number; pendientes: number; pct: number }[];
  agentes: { nombre: string; completados: number; etapa_actual: string | null; pct: number }[];
  calendario: { id: string; nombre: string; estado: string; fecha: string | null; asistentes: number }[];
  alertas: { titulo: string; detalle: string; tono: string }[];
  notificaciones: { agente: string; etapa: string; ts: string }[];
};

export async function getProgramaCapacitacion(lang = "es"): Promise<Programa> {
  const res = await authFetch(`/gestion/capacitacion/programa?lang=${lang}`);
  if (!res.ok) throw new Error(`programa: ${res.status}`);
  return res.json();
}

export type Mensaje = {
  id: string;
  tipo: string;
  texto: string | null;
  ts: string;
  chat: string | null;
  remitente: string | null;
  transcripto: boolean;
};

export type AsistenciaAgente = { id: string; nombre: string; apellido: string | null; email: string | null; celular: string | null; asistio: boolean };
export type CapacitacionAsistencia = {
  capacitacion: { id: string; nombre: string; fecha: string | null; estado: string; zoom_meeting_id: string | null };
  agentes: AsistenciaAgente[];
};

export async function getCapacitacionAsistencia(cid: string): Promise<CapacitacionAsistencia> {
  const res = await authFetch(`/gestion/capacitaciones/${cid}/asistencia`);
  if (!res.ok) throw new Error(`asistencia: ${res.status}`);
  return res.json();
}

export async function patchCapacitacion(cid: string, body: { zoom_meeting_id: string | null }): Promise<void> {
  const res = await authFetch(`/gestion/capacitaciones/${cid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch capacitacion: ${res.status}`);
}

export async function syncAsistencia(cid: string): Promise<{ ok: boolean; source: string; participantes: number; marcados: number }> {
  const res = await authFetch(`/gestion/capacitaciones/${cid}/sync-asistencia`, { method: "POST" });
  if (!res.ok) throw new Error(`sync: ${res.status}`);
  return res.json();
}

export type MensajesStats = { nuevas: number; grupos_activos: number };

export async function getMensajesStats(): Promise<MensajesStats> {
  const res = await authFetch("/gestion/mensajes-stats");
  if (!res.ok) return { nuevas: 0, grupos_activos: 0 };
  return res.json();
}

export async function getMensajes(lang = "es", tipo = "all", q = ""): Promise<Mensaje[]> {
  const qs = new URLSearchParams({ lang, tipo, q }).toString();
  const res = await authFetch(`/gestion/mensajes?${qs}`);
  if (!res.ok) throw new Error(`mensajes: ${res.status}`);
  return res.json();
}

export async function getPendientes(lang = "es"): Promise<PendientesResp> {
  const res = await authFetch(`/gestion/pendientes?lang=${lang}`);
  if (!res.ok) throw new Error(`pendientes: ${res.status}`);
  return res.json();
}

export async function createPendiente(body: {
  titulo: string;
  tipo: string;
  prioridad: string;
  agente_id: string | null;
}): Promise<void> {
  const res = await authFetch("/gestion/pendientes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`crear pendiente: ${res.status}`);
}

type PendientePatch = { estado?: string; agente_id?: string; prioridad?: string; clear_agente?: boolean };

export async function patchPendiente(id: string, body: PendientePatch): Promise<void> {
  const res = await authFetch(`/gestion/pendientes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`actualizar pendiente: ${res.status}`);
}

export const updatePendienteEstado = (id: string, estado: string) => patchPendiente(id, { estado });
export const reasignarPendiente = (id: string, agente_id: string) =>
  patchPendiente(id, agente_id ? { agente_id } : { clear_agente: true });
export const escalarPendiente = (id: string) => patchPendiente(id, { prioridad: "critico" });

// ── Reuniones / difusión ─────────────────────────────────────────────────────
export type ReunionActa = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string | null;
  resumen: string | null;
  resumen_aprobado: string | null;
  temas: string[] | null;
  acciones: { titulo: string; agente: string | null; pendiente_id: string }[] | null;
  fuente: string | null;
  capacitacion_id: string | null;
  estado_difusion: "pendiente" | "enviado";
  created_at: string;
  transcripcion?: string | null;
  n_acciones?: number;
};

export async function getReuniones(): Promise<ReunionActa[]> {
  const res = await authFetch("/gestion/reuniones");
  if (!res.ok) throw new Error(`reuniones: ${res.status}`);
  return res.json();
}

export async function getReunion(rid: string): Promise<ReunionActa> {
  const res = await authFetch(`/gestion/reuniones/${rid}`);
  if (!res.ok) throw new Error(`reunion: ${res.status}`);
  return res.json();
}

export async function patchReunion(rid: string, body: { resumen_aprobado?: string; capacitacion_id?: string }): Promise<void> {
  const res = await authFetch(`/gestion/reuniones/${rid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch reunion: ${res.status}`);
}

export async function difundirReunion(rid: string): Promise<{ ok: boolean; enviado_a: number }> {
  const res = await authFetch(`/gestion/reuniones/${rid}/difundir`, { method: "POST" });
  if (!res.ok) throw new Error(`difundir: ${res.status}`);
  return res.json();
}

export type MensajeInterno = {
  id: string;
  tipo: string;
  titulo: string | null;
  cuerpo: string | null;
  leido: boolean;
  created_at: string;
  reunion_titulo: string | null;
};

export async function getNotificaciones(): Promise<MensajeInterno[]> {
  const res = await authFetch("/gestion/notificaciones");
  if (!res.ok) return [];
  return res.json();
}

export async function marcarNotificacionLeida(nid: string): Promise<void> {
  await authFetch(`/gestion/notificaciones/${nid}/leer`, { method: "PATCH" });
}

export async function getReunionsPendientesDifusion(): Promise<ReunionActa[]> {
  const res = await authFetch("/gestion/reuniones-pendientes-difusion");
  if (!res.ok) return [];
  return res.json();
}

// ── Simulador ────────────────────────────────────────────────────────────────
export type AgenteEnEscenario = {
  agente_id: string;
  nombre: string;
  usos: number;
  puntaje_promedio: number | null;
  ultimo_puntaje: number | null;
};

export type AgenteSinPractica = {
  id: string;
  nombre: string;
};

export type EscenarioStats = {
  clave: string;
  nombre: string;
  activo: boolean;
  total_usos: number;
  puntaje_promedio: number | null;
  agentes_usaron: number;
  pct_adopcion: number;
  agentes: AgenteEnEscenario[];
  sin_practica: AgenteSinPractica[];
};

export type SimuladorStats = {
  tasa_uso: number;
  agentes_usaron: number;
  total_agentes: number;
  total_simulaciones: number;
  puntaje_promedio: number | null;
  escenarios: EscenarioStats[];
};

export async function getSimuladorStats(lang = "es"): Promise<SimuladorStats> {
  const res = await authFetch(`/gestion/simulador?lang=${lang}`);
  if (!res.ok) throw new Error(`simulador: ${res.status}`);
  return res.json();
}

// ── Memoria ──────────────────────────────────────────────────────────────────
export type MemoriaAlertas = {
  pendientes_vencidos: { id: string; titulo: string; prioridad: string; tipo: string; fecha_cierre: string; agente: string | null }[];
  sin_actividad: { id: string; nombre: string; apellido: string | null; celular: string | null; created_at: string }[];
  sin_simulacion: { id: string; nombre: string; apellido: string | null }[];
  notificaciones_olvidadas: number;
};

export async function getMemoriaAlertas(): Promise<MemoriaAlertas> {
  const res = await authFetch("/gestion/memoria/alertas");
  if (!res.ok) return { pendientes_vencidos: [], sin_actividad: [], sin_simulacion: [], notificaciones_olvidadas: 0 };
  return res.json();
}

export async function enviarMensajeMasivo(
  agente_ids: string[],
  titulo: string,
  cuerpo: string,
  tipo = "aviso",
): Promise<{ ok: boolean; enviado_a: number }> {
  const res = await authFetch("/gestion/mensajes-internos/masivo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agente_ids, titulo, cuerpo, tipo }),
  });
  if (!res.ok) throw new Error(`masivo: ${res.status}`);
  return res.json();
}

export async function patchEscenario(clave: string, activo: boolean): Promise<void> {
  const res = await authFetch(`/gestion/escenarios/${clave}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activo }),
  });
  if (!res.ok) throw new Error(`patch escenario: ${res.status}`);
}

export type NavBadges = {
  inicio: number;
  conocimiento: number;
  agentes: number;
  reuniones: number;
};

export async function getNavBadges(): Promise<NavBadges> {
  const res = await authFetch("/gestion/nav-badges");
  if (!res.ok) throw new Error(`nav-badges: ${res.status}`);
  return res.json();
}
