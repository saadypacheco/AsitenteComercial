// Lecturas/escrituras de la app del agente (su propia ruta). Vía authFetch.
import { authFetch } from "@/lib/auth";

export type RutaEtapa = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  estado: "pendiente" | "en_curso" | "completado";
  completado_at: string | null;
};

export type Ruta = {
  etapas: RutaEtapa[];
  total: number;
  completadas: number;
  pct: number;
  actual_orden: number | null;
};

export type AgenteMe = {
  nombre: string;
  apellido: string | null;
  ciudad: string | null;
  dias_desde_alta: number;
  score: number;
  ruta_pct: number;
  etapas_completadas: number;
  etapas_total: number;
  tareas_cerradas: number;
};

export async function getRuta(lang = "es"): Promise<Ruta> {
  const res = await authFetch(`/agente/ruta?lang=${lang}`);
  if (!res.ok) throw new Error(`ruta: ${res.status}`);
  return res.json();
}

export async function getMe(lang = "es"): Promise<AgenteMe> {
  const res = await authFetch(`/agente/me?lang=${lang}`);
  if (!res.ok) throw new Error(`me: ${res.status}`);
  return res.json();
}

export async function avanzar(): Promise<void> {
  const res = await authFetch("/agente/ruta/avanzar", { method: "POST" });
  if (!res.ok) throw new Error(`avanzar: ${res.status}`);
}

export type Sesion = {
  id: string;
  nombre: string;
  fecha: string;
  duracion_min: number;
  zoom_url: string | null;
  estado: string;
};

export type RankItem = {
  id: string;
  nombre: string;
  completadas: number;
  score: number;
  yo: boolean;
  pos: number;
};

export async function getAgenda(lang = "es"): Promise<Sesion[]> {
  const res = await authFetch(`/agente/agenda?lang=${lang}`);
  if (!res.ok) throw new Error(`agenda: ${res.status}`);
  return res.json();
}

export async function getRanking(): Promise<RankItem[]> {
  const res = await authFetch("/agente/ranking");
  if (!res.ok) throw new Error(`ranking: ${res.status}`);
  return res.json();
}

// ── Gamificación / Journey (Fase 1) ──────────────────────────────────────────
export type Level = { n: number; name: string; next_name: string | null; xp_into: number; xp_span: number; pct_to_next: number };
export type JourneyStep = { key: string; icon: string; label: string; done: boolean; current: boolean };
export type Mission = { icon: string; xp: number; done: boolean; label: string };
export type Achievement = { key: string; icon: string; label: string; unlocked: boolean };
export type Resumen = { etapas: number; zoom: number; ventas: number; logros: number; etapas_semana: number; xp_semana: number };
export type Journey = {
  xp: number;
  level: Level;
  ruta_pct: number;
  racha: number;
  resumen: Resumen;
  journey: JourneyStep[];
  missions: Mission[];
  achievements: Achievement[];
};

export async function getJourney(lang = "es"): Promise<Journey> {
  const res = await authFetch(`/agente/journey?lang=${lang}`);
  if (!res.ok) throw new Error(`journey: ${res.status}`);
  return res.json();
}

// ── Coach IA con RAG (Fase 3) ────────────────────────────────────────────────
export type CoachResp = { answer: string; fuentes: string[]; source: "llm" | "texto" | "sin_resultados" };

export async function askCoach(pregunta: string, lang = "es"): Promise<CoachResp> {
  const res = await authFetch(`/agente/coach?lang=${lang}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pregunta }),
  });
  if (!res.ok) throw new Error(`coach: ${res.status}`);
  return res.json();
}

// ── Simulador comercial IA (Fase 4) ──────────────────────────────────────────
export type SimMsg = { rol: "agente" | "cliente"; texto: string };
export type SimResp = { respuesta_cliente: string; feedback: string; turno: number; terminado: boolean; source: string };

export async function simChat(mensaje: string, scenario: string, historia: SimMsg[], lang = "es"): Promise<SimResp> {
  const res = await authFetch(`/agente/simulador/chat?lang=${lang}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje, scenario, historia }),
  });
  if (!res.ok) throw new Error(`simulador: ${res.status}`);
  return res.json();
}


// ── Notificaciones del agente ─────────────────────────────────────────────────
export type AgenteNotif = {
  id: string;
  tipo: string;
  titulo: string | null;
  cuerpo: string | null;
  leido: boolean;
  created_at: string;
  reunion_titulo: string | null;
};

export async function getAgenteNotificaciones(): Promise<AgenteNotif[]> {
  const res = await authFetch("/agente/notificaciones");
  if (!res.ok) return [];
  return res.json();
}

export async function marcarAgenteNotifLeida(nid: string): Promise<void> {
  await authFetch(`/agente/notificaciones/${nid}/leer`, { method: "PATCH" });
}
