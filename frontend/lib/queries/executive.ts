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

export type RiesgoAgente = {
  id: string;
  nombre: string;
  score: number;
  nivel: "alto" | "medio";
  tono: Tone;
  dias_inactivo: number;
  senales: string[];
};

export async function getRiesgoAgentes(lang = "es"): Promise<RiesgoAgente[]> {
  const res = await authFetch(`/dashboard/riesgo-agentes?lang=${lang}`);
  if (!res.ok) throw new Error(`riesgo-agentes: ${res.status}`);
  return res.json();
}

export type Accion = {
  id: string;
  ref_id: string;
  tipo: string;
  prioridad: string;
  tono: Tone;
  titulo: string;
  destinatario: string;
  canal: "whatsapp" | "email";
  motivo: string;
  mensaje: string;
};

export async function getAcciones(lang = "es"): Promise<Accion[]> {
  const res = await authFetch(`/dashboard/acciones?lang=${lang}`);
  if (!res.ok) throw new Error(`acciones: ${res.status}`);
  return res.json();
}

export async function ejecutarAccion(a: { ref_id: string; tipo: string; destinatario: string; canal: string; mensaje: string }): Promise<{ ok: boolean; modo: string }> {
  const res = await authFetch("/dashboard/acciones/ejecutar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(a),
  });
  if (!res.ok) throw new Error(`ejecutar: ${res.status}`);
  return res.json();
}

// ── Briefing diario por WhatsApp (Feature E) ─────────────────────────────────
export type BriefingConfig = {
  owner_wa_jid: string | null;
  briefing_enabled: boolean;
  briefing_hora: number;
  waha_enabled: boolean;
};

export async function getBriefingConfig(): Promise<BriefingConfig> {
  const res = await authFetch("/dashboard/briefing/config");
  if (!res.ok) throw new Error(`briefing/config: ${res.status}`);
  return res.json();
}

export async function saveBriefingConfig(c: { owner_wa_jid: string | null; briefing_enabled: boolean; briefing_hora: number }): Promise<{ ok: boolean }> {
  const res = await authFetch("/dashboard/briefing/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(c),
  });
  if (!res.ok) throw new Error(`briefing/config save: ${res.status}`);
  return res.json();
}

export async function previewBriefing(lang = "es"): Promise<{ texto: string }> {
  const res = await authFetch(`/dashboard/briefing/preview?lang=${lang}`);
  if (!res.ok) throw new Error(`briefing/preview: ${res.status}`);
  return res.json();
}

export async function sendBriefingNow(lang = "es"): Promise<{ texto: string; modo: string; ok: boolean; jid: string | null }> {
  const res = await authFetch(`/dashboard/briefing/enviar?lang=${lang}`, { method: "POST" });
  if (!res.ok) throw new Error(`briefing/enviar: ${res.status}`);
  return res.json();
}

// ── Onboarding del líder ─────────────────────────────────────────────────────
export type LiderPaso = { id: string; titulo: string; detalle: string; href: string | null };
export type LiderOnboarding = { completado: boolean; pasos: LiderPaso[] };

export async function getLiderOnboarding(lang = "es"): Promise<LiderOnboarding> {
  const res = await authFetch(`/gestion/lider/onboarding?lang=${lang}`);
  if (!res.ok) throw new Error(`lider/onboarding: ${res.status}`);
  return res.json();
}

export async function completarLiderOnboarding(): Promise<{ ok: boolean }> {
  const res = await authFetch("/gestion/lider/onboarding/completar", { method: "POST" });
  if (!res.ok) throw new Error(`lider/onboarding/completar: ${res.status}`);
  return res.json();
}

export type ConfigStatus = { ia_enabled: boolean; llm_model: string; environment: string; whatsapp_enabled: boolean; email_enabled: boolean };
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

// ── Canal WhatsApp de onboarding ─────────────────────────────────────────────
export type OnboardingGroup = { id: string; nombre: string };
export type OnboardingGroupConfig = { current: string | null; groups: OnboardingGroup[] };

export async function getOnboardingGroup(): Promise<OnboardingGroupConfig> {
  const res = await authFetch("/gestion/ajustes/onboarding-group");
  if (!res.ok) throw new Error(`onboarding-group: ${res.status}`);
  return res.json();
}

export async function setOnboardingGroup(wa_chat_id: string | null): Promise<{ ok: boolean }> {
  const res = await authFetch("/gestion/ajustes/onboarding-group", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wa_chat_id }),
  });
  if (!res.ok) throw new Error(`onboarding-group set: ${res.status}`);
  return res.json();
}

export async function search(q: string, tipo: string): Promise<SearchHit[]> {
  const qs = new URLSearchParams({ q, tipo }).toString();
  const res = await authFetch(`/dashboard/search?${qs}`);
  if (!res.ok) throw new Error(`search: ${res.status}`);
  return res.json();
}
