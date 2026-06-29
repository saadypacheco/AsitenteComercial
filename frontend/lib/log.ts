// Registro de actividad — fire-and-forget. Nunca bloquea al usuario.
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

export type Evento =
  | "login"
  | "logout"
  | "page_view"
  | "simulador_intento"
  | "simulador_completado"
  | "capacitacion_vista"
  | "reunion_abierta"
  | "agente_activado"
  | "magic_link_solicitado"
  | "set_password";

export function logEvento(
  evento: Evento,
  detalle?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("mc_token");
  fetch(`${API}/log/evento`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ evento, detalle }),
  }).catch(() => {}); // silencioso — nunca bloquea
}
