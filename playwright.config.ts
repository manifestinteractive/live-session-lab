import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

process.env.PLAYWRIGHT_BROWSERS_PATH = fileURLToPath(new URL("./.cache/ms-playwright", import.meta.url));

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: "list",
  outputDir: "artifacts/test-results",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", testIgnore: ["**/capture.spec.ts", "**/permission.spec.ts"], use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    env: { ADMISSION_ENABLED: "false", APP_ORIGIN: "http://localhost:3100" },
    timeout: 120_000,
  },
});
