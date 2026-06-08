// T025 [US2] — Resumen del día (sección "hecho" / actividad capturada).
// Lee del backend FastAPI (decisión local F-001: el backend sirve el dashboard;
// evita exigir Auth/PostgREST de Supabase en local y resuelve el acceso sin login).
// El backend aplica la ventana ET (FR-018) vía la función SQL daily_summary().
// Ref: contracts/dashboard-api.md §1
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

export type ChatActivity = {
  chat_id: string;
  nombre: string | null;
  tipo: "group" | "individual";
  mensajes: number;
  ultimo: string;
};

export type RecentMessage = {
  message_id: string;
  chat: string | null;
  remitente: string | null;
  tipo: string;
  preview: string;
  wa_timestamp: string;
};

export type DailySummary = {
  fecha_et: string;
  total_mensajes: number;
  vacio: boolean;
  por_chat: ChatActivity[];
  ultimos: RecentMessage[];
};

export async function getDailySummary(): Promise<DailySummary> {
  const res = await fetch(`${API}/dashboard/daily`, { cache: "no-store" });
  if (!res.ok) throw new Error(`daily: ${res.status}`);
  return (await res.json()) as DailySummary;
}
