// T026 [US2] — Detalle de un chat HOY (ventana ET). Lee del backend FastAPI.
// Ref: contracts/dashboard-api.md §2
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

export type MessageDetail = {
  message_id: string;
  remitente: string | null;
  tipo: string;
  body: string | null;
  wa_timestamp: string;
  transcripcion: { texto: string; idioma: string | null; audio_message_id: string } | null;
  media: { tipo: string; storage_path: string | null } | null;
};

export async function getChatDetail(chatId: string): Promise<MessageDetail[]> {
  const res = await fetch(`${API}/dashboard/chat/${chatId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`chatDetail: ${res.status}`);
  return (await res.json()) as MessageDetail[];
}
