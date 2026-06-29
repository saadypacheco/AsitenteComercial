import { authFetch } from "@/lib/auth";

export type SesionPorRol = { rol: string; total: number; usuarios_unicos: number };
export type ActividadDia = { dia: string; rol: string; eventos: number };
export type TopEvento = { evento: string; total: number };

export type UsoResumen = {
  sesiones_por_rol: SesionPorRol[];
  actividad_por_dia: ActividadDia[];
  top_eventos: TopEvento[];
  agentes_activos_30d: number;
};

export async function getUsoResumen(): Promise<UsoResumen> {
  const res = await authFetch("/log/uso");
  if (!res.ok) throw new Error("uso: " + res.status);
  return res.json();
}
