import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(process.cwd(), true);
const port = process.env.PORT ?? "3000";
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL, ...devices["Desktop Chrome"] },
  webServer: { command: process.env.E2E_PRODUCTION === "1" ? "npm run start" : "npm run dev", url: baseURL, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
