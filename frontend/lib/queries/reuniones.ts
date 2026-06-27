// Reuniones que se procesan solas (Feature B). Vía authFetch.
import { authFetch } from "@/lib/auth";

export type AccionAuto = { titulo: string; agente: string | null; pendiente_id: string };

export type ActaItem = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string | null;
  resumen: string | null;
  resumen_aprobado: string | null;
  n_acciones: number;
  capacitacion_id: string | null;
  estado_difusion: "pendiente" | "enviado";
  created_at: string;
};

export type Acta = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string | null;
  resumen: string | null;
  resumen_aprobado: string | null;
  temas: string[] | null;
  acciones: AccionAuto[] | null;
  fuente: string | null;
  capacitacion_id: string | null;
  estado_difusion: "pendiente" | "enviado";
  created_at: string;
  transcripcion?: string | null;
};

export type ProcResult = { id: string; resumen: string; temas: string[]; acciones: AccionAuto[]; n_pendientes: number };

export async function getReuniones(): Promise<ActaItem[]> {
  const res = await authFetch("/gestion/reuniones");
  if (!res.ok) throw new Error(`reuniones: ${res.status}`);
  return res.json();
}

export async function getReunion(id: string): Promise<Acta> {
  const res = await authFetch(`/gestion/reuniones/${id}`);
  if (!res.ok) throw new Error(`reunion: ${res.status}`);
  return res.json();
}

export async function procesarReunion(
  body: { titulo: string; tipo: string; transcripcion: string; capacitacion_id?: string | null },
  lang = "es"
): Promise<ProcResult> {
  const res = await authFetch(`/gestion/reuniones/procesar?lang=${lang}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`procesar: ${res.status}`);
  return res.json();
}

export async function patchReunion(
  id: string,
  body: { resumen_aprobado?: string; capacitacion_id?: string }
): Promise<void> {
  const res = await authFetch(`/gestion/reuniones/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch reunion: ${res.status}`);
}

export async function difundirReunion(id: string): Promise<{ ok: boolean; enviado_a: number }> {
  const res = await authFetch(`/gestion/reuniones/${id}/difundir`, { method: "POST" });
  if (!res.ok) throw new Error(`difundir: ${res.status}`);
  return res.json();
}

export async function getReunionsPendientesDifusion(): Promise<ActaItem[]> {
  const res = await authFetch("/gestion/reuniones-pendientes-difusion");
  if (!res.ok) return [];
  return res.json();
}
