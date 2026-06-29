// Cartera de clientes (Feature D). Vía authFetch.
import { authFetch } from "@/lib/auth";

export type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  producto: string | null;
  estado: string;
  valor: number;
  vencimiento: string | null;
  ultimo_contacto: string | null;
  vip: boolean;
  renovacion_dias: number | null;
  sin_contacto_dias: number | null;
  cross_sell: boolean;
  agente_id: string | null;
  agente: string | null;
};

export type ClientesResp = {
  summary: { total: number; por_renovar: number; sin_seguimiento: number; valor_cartera: number };
  items: Cliente[];
};

export type ClienteInput = {
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  agente_id?: string | null;
  producto?: string | null;
  estado?: string;
  valor_poliza?: number;
  vencimiento?: string | null;
  vip?: boolean;
};

export async function getClientes(): Promise<ClientesResp> {
  const res = await authFetch("/gestion/clientes");
  if (!res.ok) throw new Error(`clientes: ${res.status}`);
  return res.json();
}

export async function createCliente(body: ClienteInput): Promise<void> {
  const res = await authFetch("/gestion/clientes", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`crear cliente: ${res.status}`);
}

export async function updateCliente(id: string, body: ClienteInput): Promise<void> {
  const res = await authFetch(`/gestion/clientes/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`editar cliente: ${res.status}`);
}

export async function registrarContacto(id: string): Promise<void> {
  const res = await authFetch(`/gestion/clientes/${id}/contacto`, { method: "POST" });
  if (!res.ok) throw new Error(`contacto: ${res.status}`);
}
