import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "testes/e2e",
  timeout: 30_000,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4180", locale: "pt-BR" },
  webServer: {
    command: "node scripts/servir.mjs",
    url: "http://127.0.0.1:4180/",
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
