// Auth del cliente (FR-009): guarda el JWT, lo adjunta a cada fetch al backend y
// redirige a /login ante 401. El backend filtra por el tenant del token, así que
// el cliente nunca decide qué tenant ve.
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
const TOKEN_KEY = "mc_token";
const USER_KEY = "mc_user";

export type SessionUser = { email: string; nombre: string | null; rol: string; alcance?: string };

export function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

function setSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function logout() {
  clearSession();
  if (typeof window !== "undefined") window.location.href = "/login";
}

/** Redirige a /login si no hay sesión. Llamar en el mount de páginas protegidas. */
export function requireAuth() {
  if (typeof window !== "undefined" && !getToken()) window.location.href = "/login";
}

/** Guard de la app del agente: exige sesión con rol 'agente'. */
export function requireAgent() {
  if (typeof window === "undefined") return;
  if (!getToken() || getUser()?.rol !== "agente") window.location.href = "/agente/login";
}

/** Pide un magic link para el agente (por celular o email). Dev devuelve el link. */
export async function requestAgentMagic(identifier: string): Promise<{ ok: boolean; link?: string; ttl_minutes: number }> {
  const res = await fetch(`${API}/agente/auth/request`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier }),
  });
  if (!res.ok) throw new Error("No se pudo generar el enlace");
  return res.json();
}

/** Canjea el magic link del agente por una sesión (rol 'agente'). */
export async function verifyAgentMagic(token: string): Promise<void> {
  const res = await fetch(`${API}/agente/auth/verify`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Enlace inválido o expirado");
  const data = (await res.json()) as { access_token: string; agente: { nombre: string } };
  setSession(data.access_token, { email: "", nombre: data.agente.nombre, rol: "agente" });
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Credenciales incorrectas");
  const data = (await res.json()) as { access_token: string; user: SessionUser };
  setSession(data.access_token, data.user);
}

/** Pide un magic link. En dev el backend devuelve el link para probar sin email. */
export async function requestMagicLink(
  email: string,
): Promise<{ ok: boolean; link?: string; ttl_minutes: number }> {
  const res = await fetch(`${API}/auth/magic-link/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("No se pudo generar el enlace");
  return res.json();
}

/** Canjea el token del magic link por una sesión. */
export async function verifyMagicLink(token: string): Promise<void> {
  const res = await fetch(`${API}/auth/magic-link/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Enlace inválido o expirado");
  const data = (await res.json()) as { access_token: string; user: SessionUser };
  setSession(data.access_token, data.user);
}

/** fetch con Bearer; ante 401 limpia sesión y manda a /login. */
export async function authFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { ...(opts.headers ?? {}), Authorization: `Bearer ${token ?? ""}` },
    cache: "no-store",
  });
  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("No autenticado");
  }
  return res;
}
