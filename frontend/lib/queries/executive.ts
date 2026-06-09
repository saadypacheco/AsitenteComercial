// Lecturas del DASHBOARD EJECUTIVO "¡Hola Cecilia!" (Producto ②).
// Todo sale del backend FastAPI (mismo patrón que daily.ts): un agregado por
// pantalla + buscador + endpoints de IA (LiteLLM con fallback determinista).
// Vía authFetch → adjunta el Bearer y filtra por el tenant del token (FR-009).
import { authFetch } from "@/lib/auth";

export type Tone = "brand" | "danger" | "warning" | "ok" | "neutral";

export type Executive = {
  fecha_et: string;
  pulso: {
    mensajes_hoy: number;
    mensajes_ayer: number;
    delta_pct: number | null;
    grupos_activos: number;
    serie_7d: number[];
  };
  salud: { score: number; label: string; tono: Tone };
  alertas: { titulo: string; detalle: string; tono: Tone }[];
  oportunidades: { titulo: string; detalle: string; nivel: string }[];
  pendientes: { total: number; criticos: number; en_proceso: number; pendientes: number };
  ranking: {
    nombre: string;
    interacciones: number;
    pendientes_cerrados: number;
    participacion: number;
  }[];
  grupos: {
    nombre: string;
    tipo: string;
    mensajes_7d: number;
    estado: "activo" | "atencion" | "inactivo";
    actividad: "alta" | "media" | "baja";
  }[];
  timeline: { ts: string; tipo: string; tono: Tone; titulo: string; detalle: string }[];
};

export type SearchHit = {
  tipo: string;
  texto: string | null;
  chat: string | null;
  remitente: string | null;
  message_id: string;
};

export type AiBullet = { tono: Tone; texto: string };

// ── Centro de Control (Inicio rediseñado) ────────────────────────────────────
export type Command = {
  kpis: {
    conversaciones: { value: number; delta: number | null; tono: Tone };
    ventas: { value: number; valor: number; delta: number | null; tono: Tone };
    criticos: { value: number; tono: Tone };
    riesgo: { value: number; tono: Tone };
    conectados: { value: number; total: number; tono: Tone };
  };
  recomendaciones: { prioridad: string; tono: Tone; accion: string; motivo: string }[];
  equipo: { id: string; nombre: string; abiertas: number; cerrados: number; crit: number; estado: string; tono: Tone }[];
  ranking: { nombre: string; interacciones: number; ventas: number; conversiones: number }[];
  alertas: { id: string; cliente: string; titulo: string; prioridad: string; vip: boolean; horas: number; responsable: string | null }[];
  oportunidades: { id: string; titulo: string; producto: string | null; nivel: string | null; probabilidad: number; potencial: number }[];
  actividad: { serie_7d: number[]; total_7d: number };
};

export async function getCommand(lang = "es"): Promise<Command> {
  const res = await authFetch(`/dashboard/command?lang=${lang}`);
  if (!res.ok) throw new Error(`command: ${res.status}`);
  return res.json();
}

export type ConfigStatus = { ia_enabled: boolean; llm_model: string; environment: string };
export async function getConfigStatus(): Promise<ConfigStatus> {
  const res = await authFetch("/config/status");
  if (!res.ok) throw new Error(`config: ${res.status}`);
  return res.json();
}

export async function getExecutive(lang = "es"): Promise<Executive> {
  const res = await authFetch(`/dashboard/executive?lang=${lang}`);
  if (!res.ok) throw new Error(`executive: ${res.status}`);
  return (await res.json()) as Executive;
}

export async function getAiSummary(lang = "es"): Promise<{ bullets: AiBullet[]; source: string }> {
  const res = await authFetch(`/dashboard/ai/summary?lang=${lang}`);
  if (!res.ok) throw new Error(`ai/summary: ${res.status}`);
  return res.json();
}

export async function askAi(question: string, lang = "es"): Promise<{ answer: string; source: string }> {
  const res = await authFetch(`/dashboard/ai/ask?lang=${lang}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`ai/ask: ${res.status}`);
  return res.json();
}

export async function search(q: string, tipo: string): Promise<SearchHit[]> {
  const qs = new URLSearchParams({ q, tipo }).toString();
  const res = await authFetch(`/dashboard/search?${qs}`);
  if (!res.ok) throw new Error(`search: ${res.status}`);
  return res.json();
}
