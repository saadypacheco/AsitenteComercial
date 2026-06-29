/**
 * Tests E2E de seguridad — regresiones de control de acceso y aislamiento.
 *
 * Bugs cubiertos:
 *   BUG-S04  (2026-06-25): Magic link reutilizable — decode_magic_token no invalidaba
 *     el token al usarlo. Fix: jti claim + _used_magic_jtis blacklist en auth.py.
 *   BUG-S07  (2026-06-25): Token de agente accedía a /dashboard/command (200 en vez de 403).
 *     Fix: view_ctx dependency rechaza rol=agente.
 *   BUG-ACCIONES-CORS (2026-06-25): /dashboard/acciones/ejecutar lanzaba UndefinedColumn
 *     (aprobado_por) → CORS error en browser. Fix: migración 0023 aplicada +
 *     incluida en 00_run_migrations.sql.
 *
 * Pre-condición: stack local corriendo en http://localhost:3002 y :8002.
 *   docker compose -f infra/docker-compose.local.yml up -d
 */
import { expect, test } from "@playwright/test";

const BACKEND = "http://localhost:8002";
const DEMO_EMAIL    = "cecilia@demo.com";
const DEMO_PASSWORD = "demo1234";
const AGENTE_EMAIL  = "maria@demo.com";   // agente con email+celular en la BD

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginOwner(page: import("@playwright/test").Page) {
  const resp = await page.request.post(`${BACKEND}/auth/login`, {
    data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  expect(resp.ok()).toBeTruthy();
  return (await resp.json()).access_token as string;
}

async function requestAgenteMagicLink(page: import("@playwright/test").Page, identifier = AGENTE_EMAIL) {
  const resp = await page.request.post(`${BACKEND}/agente/auth/request`, {
    data: { identifier },
  });
  expect(resp.ok()).toBeTruthy();
  const { link } = await resp.json();
  expect(link, "El backend debe devolver el link en entorno development").toBeTruthy();
  const match = link.match(/[?&]token=([^&]+)/);
  expect(match, "El link debe contener ?token=...").toBeTruthy();
  return match![1] as string;
}

async function verifyMagicToken(page: import("@playwright/test").Page, token: string) {
  return page.request.post(`${BACKEND}/agente/auth/verify`, { data: { token } });
}

// ── Suite: BUG-S04 — Magic link de un solo uso ────────────────────────────────

test.describe("BUG-S04: Magic link de agente (un solo uso)", () => {

  test("primer verify retorna 200 con access_token", async ({ page }) => {
    const token = await requestAgenteMagicLink(page);
    const resp = await verifyMagicToken(page, token);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.access_token).toBeTruthy();
  });

  test("segundo verify con el mismo token retorna 401", async ({ page }) => {
    // Regresión: antes del fix, el segundo verify también devolvía 200.
    const token = await requestAgenteMagicLink(page);
    await verifyMagicToken(page, token);                        // primer uso — OK
    const second = await verifyMagicToken(page, token);         // segundo — debe fallar
    expect(second.status()).toBe(401);
    const body = await second.json();
    expect(body.detail).toMatch(/enlace.*utilizado|inválido|expirado/i);
  });

  test("token manipulado retorna 401", async ({ page }) => {
    const resp = await page.request.post(`${BACKEND}/agente/auth/verify`, {
      data: { token: "este.no.es.un.jwt.valido" },
    });
    expect(resp.status()).toBe(401);
  });

  test("cada solicitud genera un link diferente (jti único)", async ({ page }) => {
    const t1 = await requestAgenteMagicLink(page);
    const t2 = await requestAgenteMagicLink(page);
    expect(t1).not.toBe(t2);
  });
});

// ── Suite: BUG-S07 — Token de agente rechazado en endpoints del panel ─────────

test.describe("BUG-S07: Token de agente rechazado en /dashboard/*", () => {

  test("/dashboard/command retorna 403 con token de agente", async ({ page }) => {
    // Regresión: antes del fix, view_ctx no verificaba el rol y devolvía 200.
    const magicToken = await requestAgenteMagicLink(page);
    const verifyResp = await verifyMagicToken(page, magicToken);
    const { access_token: agenteToken } = await verifyResp.json();

    const resp = await page.request.get(`${BACKEND}/dashboard/command?lang=es`, {
      headers: { Authorization: `Bearer ${agenteToken}` },
    });
    expect(resp.status()).toBe(403);
    const body = await resp.json();
    expect(body.detail).toMatch(/panel|agente/i);
  });

  test("/dashboard/acciones retorna 403 con token de agente", async ({ page }) => {
    const magicToken = await requestAgenteMagicLink(page);
    const verifyResp = await verifyMagicToken(page, magicToken);
    const { access_token: agenteToken } = await verifyResp.json();

    const resp = await page.request.get(`${BACKEND}/dashboard/acciones?lang=es`, {
      headers: { Authorization: `Bearer ${agenteToken}` },
    });
    expect(resp.status()).toBe(403);
  });

  test("token de owner accede a /agente/me con 403 (rol incorrecto)", async ({ page }) => {
    const ownerToken = await loginOwner(page);
    const resp = await page.request.get(`${BACKEND}/agente/me?lang=es`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(resp.status()).toBe(403);
  });

  test("token de agente accede a /agente/me con 200", async ({ page }) => {
    const magicToken = await requestAgenteMagicLink(page, "sofia@demo.com");
    const verifyResp = await verifyMagicToken(page, magicToken);
    const { access_token: agenteToken } = await verifyResp.json();

    const resp = await page.request.get(`${BACKEND}/agente/me?lang=es`, {
      headers: { Authorization: `Bearer ${agenteToken}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.nombre).toBe("Sofía");
  });
});

// ── Suite: BUG-ACCIONES-CORS — migración 0023 aplicada ───────────────────────

test.describe("BUG-ACCIONES-CORS: /dashboard/acciones/ejecutar (migración 0023)", () => {

  test("ejecutar retorna 200 (sin UndefinedColumn CORS error)", async ({ page }) => {
    // Regresión: antes de aplicar 0023, el endpoint lanzaba UndefinedColumn
    // (aprobado_por) → FastAPI generaba un 500 sin headers CORS → CORS error en browser.
    const ownerToken = await loginOwner(page);

    // Obtener una acción pendiente
    const listResp = await page.request.get(`${BACKEND}/dashboard/acciones?lang=es`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(listResp.ok()).toBeTruthy();
    const acciones = await listResp.json();
    expect(Array.isArray(acciones) && acciones.length > 0, "Debe haber acciones").toBeTruthy();
    const primera = acciones[0];

    // Ejecutar
    const execResp = await page.request.post(`${BACKEND}/dashboard/acciones/ejecutar`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        ref_id:       primera.ref_id,
        tipo:         primera.tipo,
        destinatario: primera.destinatario,
        canal:        primera.canal,
        mensaje:      primera.mensaje,
      },
    });
    expect(execResp.status()).toBe(200);
    const body = await execResp.json();
    expect(body.ok).toBe(true);
  });

  test("ejecutar no genera errores CORS en el browser", async ({ page }) => {
    const corsErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") corsErrors.push(msg.text());
    });

    // Login y navegar a /acciones (navegar primero para que localStorage esté disponible)
    await page.goto("http://localhost:3002/login");
    await page.evaluate(() => localStorage.clear());
    await page.getByLabel(/Email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/Contraseña/i).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /Ingresar/i }).click();
    await page.waitForURL("**/inicio");
    await page.goto("http://localhost:3002/acciones");
    await page.waitForLoadState("networkidle");

    // Aprobar la primera acción
    const firstBtn = page.locator('button:has-text("Aprobar y enviar")').first();
    await expect(firstBtn).toBeVisible({ timeout: 10_000 });
    await firstBtn.click();
    await page.waitForTimeout(2_000);

    const corsFails = corsErrors.filter(
      (e) => e.includes("CORS") || e.includes("Access-Control"),
    );
    expect(corsFails, `Errores CORS detectados: ${corsFails.join(" | ")}`).toHaveLength(0);
  });
});
