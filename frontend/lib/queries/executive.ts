// Lecturas del DASHBOARD EJECUTIVO "¡Hola Cecilia!" (Producto ②).
// Todo sale del backend FastAPI (mismo patrón que daily.ts): un agregado por
// pantalla + buscador + endpoints de IA (LiteLLM con fallback determinista).
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

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

export async function getExecutive(): Promise<Executive> {
  const res = await fetch(`${API}/dashboard/executive`, { cache: "no-store" });
  if (!res.ok) throw new Error(`executive: ${res.status}`);
  return (await res.json()) as Executive;
}

export async function getAiSummary(): Promise<{ bullets: AiBullet[]; source: string }> {
  const res = await fetch(`${API}/dashboard/ai/summary`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ai/summary: ${res.status}`);
  return res.json();
}

export async function askAi(question: string): Promise<{ answer: string; source: string }> {
  const res = await fetch(`${API}/dashboard/ai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`ai/ask: ${res.status}`);
  return res.json();
}

export async function search(q: string, tipo: string): Promise<SearchHit[]> {
  const url = new URL(`${API}/dashboard/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("tipo", tipo);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`search: ${res.status}`);
  return res.json();
}
