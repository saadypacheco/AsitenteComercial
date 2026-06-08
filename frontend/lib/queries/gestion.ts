// Lecturas/escrituras de gestión (rebanada F-002) vía authFetch (Bearer + tenant).
import { authFetch } from "@/lib/auth";

export type AgenteOption = { id: string; nombre: string; apellido: string | null; estado: string };

export type Pendiente = {
  id: string;
  titulo: string;
  tipo: string;
  prioridad: "critico" | "alto" | "medio" | "bajo";
  estado: "pendiente" | "en_proceso" | "cerrado";
  created_at: string;
  fecha_cierre: string | null;
  agente_id: string | null;
  agente: string | null;
};

export type PendientesResp = {
  progreso: { cerrados: number; abiertos: number; total: number; pct: number };
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

export async function updatePendienteEstado(id: string, estado: string): Promise<void> {
  const res = await authFetch(`/gestion/pendientes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
  if (!res.ok) throw new Error(`actualizar pendiente: ${res.status}`);
}
