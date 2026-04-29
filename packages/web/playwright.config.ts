import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const apiBaseUrl = process.env.E2E_API_BASE_URL ?? "http://localhost:3000";
const databaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgres://todos:todos@localhost:5432/todos_e2e";
// When running against an externally-managed stack (docker compose -f ... -f docker-compose.test.yml),
// the api/web servers are already up — skip Playwright's `webServer` boot.
const useExternalStack = process.env.E2E_EXTERNAL_STACK === "1";

// In external-stack mode the dev-server fallback (localhost:5173) is meaningless;
// fail loudly instead of silently aiming the suite at the wrong port.
if (useExternalStack && !process.env.PLAYWRIGHT_BASE_URL) {
  throw new Error(
    "E2E_EXTERNAL_STACK=1 requires PLAYWRIGHT_BASE_URL to be set (e.g. http://web).",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: useExternalStack
    ? undefined
    : [
        {
          command: "npm run dev --workspace=@bmad-todo/api",
          cwd: "../..",
          env: {
            DATABASE_URL: databaseUrl,
            PORT: "3000",
            LOG_LEVEL: "warn",
            CORS_ORIGIN: baseURL,
            NODE_ENV: "test",
          },
          url: `${apiBaseUrl}/healthz`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
        },
        {
          command: "npm run dev",
          env: {
            VITE_API_BASE_URL: apiBaseUrl,
          },
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
          stdout: "pipe",
          stderr: "pipe",
        },
      ],
});
