/**
 * Tests E2E — App del agente: Coach IA y Simulador comercial.
 *
 * Bugs cubiertos:
 *   BUG-COACH-SQL (2026-06-25): /agente/coach lanzaba psycopg.errors.SyntaxError
 *     ("trailing junk after parameter at or near '$3order'") cuando se pasaba
 *     tenant_id en la query SQL de knowledge_base.py — faltaba espacio antes de
 *     ORDER BY al concatenar el snippet `and tenant_id=%s`. El 500 resultante
 *     generaba CORS error en el browser (sin headers CORS en error 5xx).
 *     Fix: trailing space en la variable `sc` en knowledge_base.py.
 *
 * Pre-condición: stack local corriendo en http://localhost:3002 y :8002.
 *   docker compose -f infra/docker-compose.local.yml up -d
 */
import { expect, test } from "@playwright/test";

const BACKEND = "http://localhost:8002";
const AGENTE_EMAIL = "sofia@demo.com";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAgente(page: import("@playwright/test").Page) {
  const reqResp = await page.request.post(`${BACKEND}/agente/auth/request`, {
    data: { identifier: AGENTE_EMAIL },
  });
  expect(reqResp.ok()).toBeTruthy();
  const { link } = await reqResp.json();
  expect(link, "El backend debe devolver el link en entorno development").toBeTruthy();
  const match = link.match(/[?&]token=([^&]+)/);
  expect(match, "El link debe contener ?token=...").toBeTruthy();
  const token = match![1] as string;

  const verifyResp = await page.request.post(`${BACKEND}/agente/auth/verify`, {
    data: { token },
  });
  expect(verifyResp.ok()).toBeTruthy();
  const { access_token } = await verifyResp.json();
  expect(access_token).toBeTruthy();
  return access_token as string;
}

// ── Suite: BUG-COACH-SQL — /agente/coach sin SyntaxError ────────────────────

test.describe("BUG-COACH-SQL: /agente/coach sin SyntaxError de SQL", () => {

  test("POST /agente/coach retorna 200 (sin SyntaxError psycopg)", async ({ page }) => {
    // Regresión: antes del fix, la query SQL de knowledge_base.py concatenaba
    // `and tenant_id=%s` sin espacio al final, resultando en `%sorder by` →
    // psycopg SyntaxError → 500 → CORS error en browser.
    const agenteToken = await loginAgente(page);

    const resp = await page.request.post(`${BACKEND}/agente/coach?lang=es`, {
      headers: { Authorization: `Bearer ${agenteToken}` },
      data: { pregunta: "¿cómo manejo la objeción de precio?" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.answer).toBeTruthy();
    expect(["llm", "texto", "sin_resultados"]).toContain(body.source);
  });

  test("coach responde con fallback cuando KB está vacía", async ({ page }) => {
    const agenteToken = await loginAgente(page);

    const resp = await page.request.post(`${BACKEND}/agente/coach?lang=es`, {
      headers: { Authorization: `Bearer ${agenteToken}` },
      data: { pregunta: "¿cuál es el precio de AAPL?" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    // Si no hay docs en KB: source = sin_resultados; el answer no debe estar vacío
    expect(body.answer).toBeTruthy();
    expect(body.answer).not.toBe("—");
  });

  test("coach no genera CORS error en el browser", async ({ page }) => {
    const corsErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") corsErrors.push(msg.text());
    });

    // Login y navegar como agente
    const reqResp = await page.request.post(`${BACKEND}/agente/auth/request`, {
      data: { identifier: AGENTE_EMAIL },
    });
    const { link } = await reqResp.json();
    await page.goto(link);
    await page.waitForURL("**/agente");
    await page.waitForTimeout(1000);

    // Abrir Coach IA
    await page.locator("a:has-text('Simular'), button:has-text('Simular')").first().click();
    await page.waitForTimeout(500);
    await page.locator("button:has-text('Ayuda')").last().click();
    await page.waitForTimeout(500);

    // Enviar pregunta
    const input = page.locator('input[placeholder="¿Cómo manejo la objeción de precio?"]');
    await expect(input).toBeVisible({ timeout: 5_000 });
    await input.fill("¿cómo manejo la objeción de precio?");
    await input.press("Enter");
    await page.waitForTimeout(3_000);

    // Verificar respuesta visible y sin CORS
    const text = await page.evaluate(() => document.body.innerText);
    const coachPart = text.split("COACH IA")[1] || "";
    expect(coachPart.length, "El coach debe devolver alguna respuesta").toBeGreaterThan(10);

    const corsFails = corsErrors.filter(
      (e) => e.includes("CORS") || e.includes("Access-Control"),
    );
    expect(corsFails, `Errores CORS detectados: ${corsFails.join(" | ")}`).toHaveLength(0);
  });
});

// ── Suite: Simulador comercial ────────────────────────────────────────────────

test.describe("Simulador comercial: escenarios y conversación", () => {

  test("simulador acepta mensaje y devuelve respuesta del cliente", async ({ page }) => {
    const agenteToken = await loginAgente(page);

    const resp = await page.request.post(`${BACKEND}/agente/simulador/chat?lang=es`, {
      headers: { Authorization: `Bearer ${agenteToken}` },
      data: {
        escenario: "primera_llamada",
        historia: [],
        mensaje: "Hola, llamo de AIG para hablar de su protección familiar",
      },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.respuesta_cliente).toBeTruthy();
    expect(typeof body.turno).toBe("number");
    expect(typeof body.terminado).toBe("boolean");
  });

  test("simulador completa 5 turnos y marca terminado=true", async ({ page }) => {
    // El backend calcula turno = len(historia) // 2 + 1 y terminado = turno >= 5.
    // El campo del modelo es `historia` (no historial).
    const agenteToken = await loginAgente(page);

    const historia: { rol: string; texto: string }[] = [];
    let terminado = false;
    let turno = 0;
    const mensajes = [
      "Hola, llamo de AIG para hablar de su protección familiar",
      "Soy Sofía. ¿Tiene un minuto para hablar de seguros?",
      "Entiendo. ¿Sus hijos están protegidos si algo le pasa?",
      "Tenemos pólizas desde $50/mes para toda la familia.",
      "¿Le parece si agendamos una llamada mañana?",
    ];

    for (const mensaje of mensajes) {
      const resp = await page.request.post(`${BACKEND}/agente/simulador/chat?lang=es`, {
        headers: { Authorization: `Bearer ${agenteToken}` },
        data: { escenario: "primera_llamada", historia, mensaje },
      });
      expect(resp.status()).toBe(200);
      const body = await resp.json();
      historia.push({ rol: "agente", texto: mensaje });
      historia.push({ rol: "cliente", texto: body.respuesta_cliente });
      turno = body.turno;
      terminado = body.terminado;
    }

    expect(terminado).toBe(true);
    expect(turno).toBeGreaterThanOrEqual(5);
  });

  test("simulador funciona para escenario manejo-de-objeciones", async ({ page }) => {
    const agenteToken = await loginAgente(page);

    const resp = await page.request.post(`${BACKEND}/agente/simulador/chat?lang=es`, {
      headers: { Authorization: `Bearer ${agenteToken}` },
      data: {
        escenario: "manejo_objeciones",
        historia: [],
        mensaje: "Buenos días, le llamo sobre su seguro",
      },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.respuesta_cliente).toBeTruthy();
  });
});
