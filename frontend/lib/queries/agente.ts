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
