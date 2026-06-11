// Reuniones que se procesan solas (Feature B). Vía authFetch.
import { authFetch } from "@/lib/auth";

export type AccionAuto = { titulo: string; agente: string | null; pendiente_id: string };

export type ActaItem = { id: string; titulo: string; tipo: string; fecha: string; resumen: string; n_acciones: number };

export type Acta = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  resumen: string;
  temas: string[];
  acciones: AccionAuto[];
  fuente: string;
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

export async function procesarReunion(body: { titulo: string; tipo: string; transcripcion: string }, lang = "es"): Promise<ProcResult> {
  const res = await authFetch(`/gestion/reuniones/procesar?lang=${lang}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`procesar: ${res.status}`);
  return res.json();
}
