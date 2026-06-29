import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3002",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // El stack local debe estar corriendo antes de ejecutar los tests.
  // Levantarlo con: docker compose -f infra/docker-compose.local.yml up -d
});
