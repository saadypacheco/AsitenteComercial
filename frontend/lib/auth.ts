// Auth del cliente (FR-009): guarda el JWT, lo adjunta a cada fetch al backend y
// redirige a /login ante 401. El backend filtra por el tenant del token, así que
// el cliente nunca decide qué tenant ve.
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
const TOKEN_KEY = "mc_token";
const USER_KEY = "mc_user";

export type SessionUser = { email: string; nombre: string | null; rol: string };

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
