# E1-S4 — Wire Playwright in `packages/web`

**Epic:** E1 — Project Scaffolding
**Status:** ready
**Estimated:** S
**Blocked by:** E1-S1

## User value

> "I want the E2E harness ready before there's a UI to test, so adding the first real spec in E3 is a one-liner."

## Acceptance criteria

**Given** Playwright is installed in `packages/web`
**When** I run `npm run test:e2e` from the repo root
**Then** Playwright runs the trivial spec and reports pass

**Given** the trivial spec
**When** it executes
**Then** it opens `about:blank`, asserts the document title is empty, and exits clean (no UI dependency yet)

**Given** the Playwright config
**When** the test runs
**Then** it generates an HTML report at `packages/web/playwright-report/`
  And the report directory is gitignored

**Given** axe-core wiring (added now, used later)
**When** I install `@axe-core/playwright`
**Then** it is available as a dev dependency in `packages/web` so E3-S7 can import it without a new install step

## Implementation notes

- `npx playwright install --with-deps` documented in the README; install of browsers is a one-time per-machine step (don't auto-run in CI without caching).
- `packages/web/playwright.config.ts`:
  - `testDir: "./tests/e2e"`
  - `reporter: [["list"], ["html", { open: "never" }]]`
  - `use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080" }`
  - `webServer` block left commented for now — wired in E3-S7 once there's an app to start.
- Trivial spec at `packages/web/tests/e2e/smoke.spec.ts`:
  ```ts
  import { test, expect } from "@playwright/test";
  test("playwright is alive", async ({ page }) => {
    await page.goto("about:blank");
    await expect(page).toHaveTitle("");
  });
  ```
- Root scripts:
  ```json
  "test:e2e": "npm run test:e2e --workspace=@bmad-todo/web",
  ```
  And inside `packages/web/package.json`:
  ```json
  "test:e2e": "playwright test"
  ```

## Test scenarios

| Level | Scenario |
|---|---|
| Unit | n/a |
| Integration | n/a |
| E2E | The smoke spec passes; a deliberately broken spec (assert wrong title) fails as expected |

## Dependencies

- E1-S1

## Definition of Done

- All ACs pass
- Playwright report dir gitignored
- README updated with the one-time `npx playwright install` note
