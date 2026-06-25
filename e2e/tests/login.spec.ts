/**
 * Tests E2E del flujo de login.
 *
 * Regresiones cubiertas:
 *   BUG-LOGIN-REDIRECT  (2026-06-25): /login no redirigía a /inicio cuando
 *     ya había sesión activa en localStorage. Fix: useEffect en login/page.tsx.
 *   BUG-COMMAND-CORS    (2026-06-25): /dashboard/command fallaba con CORS error
 *     en el primer login con contraseña porque el pool devolvía una conexión
 *     stale. Fix: check=ConnectionPool.check_connection en pool.py.
 *
 * Pre-condición: stack local corriendo en http://localhost:3002 y :8002.
 *   docker compose -f infra/docker-compose.local.yml up -d
 */
import { expect, test } from "@playwright/test";

const TOKEN_KEY = "mc_token";
const USER_KEY  = "mc_user";
const DEMO_EMAIL    = "cecilia@demo.com";
const DEMO_PASSWORD = "demo1234";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function clearSession(page: import("@playwright/test").Page) {
  await page.evaluate(
    ([tk, uk]) => { localStorage.removeItem(tk); localStorage.removeItem(uk); },
    [TOKEN_KEY, USER_KEY],
  );
}

async function loginViaApi(page: import("@playwright/test").Page) {
  // Obtiene el JWT directamente del backend y lo mete en localStorage,
  // sin pasar por el formulario (más rápido para tests que no prueban el form).
  const resp = await page.request.post("http://localhost:8002/auth/login", {
    data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  expect(resp.ok()).toBeTruthy();
  const { access_token, user } = await resp.json();
  await page.evaluate(
    ([tk, uk, token, userData]) => {
      localStorage.setItem(tk as string, token as string);
      localStorage.setItem(uk as string, JSON.stringify(userData));
    },
    [TOKEN_KEY, USER_KEY, access_token, user],
  );
}

// ── Suite: página de login ────────────────────────────────────────────────────

test.describe("Página de login", () => {

  test("muestra el formulario cuando no hay sesión activa", async ({ page }) => {
    await page.goto("/login");
    await clearSession(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: /Iniciar sesión/i })).toBeVisible();
    expect(page.url()).toContain("/login");
  });

  test("credenciales incorrectas muestran mensaje de error", async ({ page }) => {
    await page.goto("/login");
    await clearSession(page);
    await page.reload();
    await page.getByLabel(/Email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/Contraseña/i).fill("contraseña_incorrecta");
    await page.getByRole("button", { name: /Ingresar/i }).click();
    await expect(page.getByText(/Email o contraseña incorrectos/i)).toBeVisible();
    expect(page.url()).toContain("/login");
  });

  test("login correcto redirige a /inicio", async ({ page }) => {
    await page.goto("/login");
    await clearSession(page);
    await page.reload();
    await page.getByLabel(/Email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/Contraseña/i).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /Ingresar/i }).click();
    await page.waitForURL("**/inicio");
    expect(page.url()).toContain("/inicio");
  });

  // BUG-LOGIN-REDIRECT: regresión — /login debe redirigir si hay sesión activa.
  test("redirige a /inicio si ya hay sesión activa en localStorage", async ({ page }) => {
    // Cargamos /login primero (página estable sin token) para poder setear
    // localStorage sin que una redirección destruya el contexto de evaluación.
    await page.goto("/login");
    await clearSession(page);
    await loginViaApi(page);
    // Con sesión activa, volver a /login → debe redirigir automáticamente a /inicio.
    await page.goto("/login");
    await page.waitForURL("**/inicio", { timeout: 5_000 });
    expect(page.url()).toContain("/inicio");
  });

  test("toggle de idioma cambia el contenido a inglés", async ({ page }) => {
    await page.goto("/login");
    await clearSession(page);
    await page.reload();
    await page.getByRole("button", { name: /toggle language/i }).click();
    await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible();
  });

  test("flujo de recuperación: muestra formulario y confirma envío", async ({ page }) => {
    await page.goto("/login");
    await clearSession(page);
    await page.reload();
    await page.getByRole("button", { name: /Olvidaste tu contraseña/i }).click();
    await expect(page.getByRole("heading", { name: /Recuperar acceso/i })).toBeVisible();

    await page.getByLabel(/Email/i).fill(DEMO_EMAIL);
    await page.getByRole("button", { name: /Enviar enlace/i }).click();

    // En dev el backend muestra el link directo.
    await expect(page.getByText(/enlace mágico/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Abrir enlace de acceso/i })).toBeVisible();
  });

  test("magic link autentica y redirige a /inicio", async ({ page }) => {
    await page.goto("/login");
    await clearSession(page);
    await page.reload();
    await page.getByRole("button", { name: /Olvidaste tu contraseña/i }).click();
    await page.getByLabel(/Email/i).fill(DEMO_EMAIL);
    await page.getByRole("button", { name: /Enviar enlace/i }).click();

    const linkBtn = page.getByRole("link", { name: /Abrir enlace de acceso/i });
    await expect(linkBtn).toBeVisible();
    await linkBtn.click();

    await page.waitForURL("**/inicio", { timeout: 10_000 });
    expect(page.url()).toContain("/inicio");
  });

  test("volver a iniciar sesión desde recuperación regresa al formulario", async ({ page }) => {
    await page.goto("/login");
    await clearSession(page);
    await page.reload();
    await page.getByRole("button", { name: /Olvidaste tu contraseña/i }).click();
    await page.getByRole("button", { name: /Volver a iniciar sesión/i }).click();
    await expect(page.getByRole("heading", { name: /Iniciar sesión/i })).toBeVisible();
  });
});

// ── Suite: dashboard post-login ───────────────────────────────────────────────

test.describe("Dashboard después del login", () => {

  // BUG-COMMAND-CORS: regresión — /dashboard/command debe responder 200 en el
  // primer login con contraseña (antes fallaba por conexión stale en el pool).
  test("KPIs cargan sin error CORS en el primer login con contraseña", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Login completo vía formulario (no shortcut de API) para reproducir el flujo real.
    await page.goto("/login");
    await clearSession(page);
    await page.reload();
    await page.getByLabel(/Email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/Contraseña/i).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /Ingresar/i }).click();
    await page.waitForURL("**/inicio");

    // Espera a que los KPIs estén visibles (indica que command respondió OK).
    await expect(page.getByText(/Conversaciones activas/i)).toBeVisible({ timeout: 15_000 });

    const corsErrors = errors.filter((e) => e.includes("CORS") || e.includes("Access-Control"));
    expect(corsErrors, `Errores CORS detectados: ${corsErrors.join(" | ")}`).toHaveLength(0);
  });

  test("el nombre del usuario aparece en el saludo", async ({ page }) => {
    await page.goto("/inicio");
    await loginViaApi(page);
    await page.reload();
    await expect(page.getByText(/Hola Cecilia/i)).toBeVisible({ timeout: 10_000 });
  });
});
