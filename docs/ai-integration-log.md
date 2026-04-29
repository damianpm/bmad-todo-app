# AI Integration Log

> Running record of how AI agents and MCP tools assisted the BMAD-driven development of this Todo app. Updated continuously through Steps 1–4.

## Step 1 — Initialize BMAD and generate specifications

### Tooling used in Step 1

| Tool | Purpose | Notes |
|---|---|---|
| Claude Code (Opus 4.7) | Orchestration, plan-mode planning, executing each agent role | Plan mode used to design Step 1; auto mode used to execute |
| `npx bmad-method install` | Installed BMAD framework v6.5.0 with `core` + `bmm` modules and `claude-code` IDE integration | Non-interactive flags used: `--modules bmm --tools claude-code --user-name Damian --yes` |
| BMAD skill files (`.claude/skills/bmad-*`) | Authored specifications | See "Skill registration finding" below |
| WebFetch / WebSearch | Researched BMAD docs, current React / Node versions | React 19.2.5 and Node 24 LTS picked over outdated defaults after a user prompt |

### Skill registration finding (load-bearing)

Skills installed by `npx bmad-method install` land in `.claude/skills/<name>/SKILL.md`, but Claude Code only registers skills at session start. Skills installed mid-session are **not** auto-discoverable via the `Skill` tool until the session reloads.

**Workaround used:** Read each `SKILL.md` and execute its instructions inline as Claude playing the agent persona. The output is functionally identical because BMAD skills *are* prompt files — invoking them via the Skill tool just loads the same instructions into context.

**Implication for the assignment write-up:** When the README documents "we used BMAD", it is accurate but should note that skill dispatch was substituted with inline execution due to the session-lifecycle limitation. A `/clear` between install and use would have enabled native dispatch.

### Installer bug (worked around)

The installer left an unsubstituted `{output_folder}` placeholder in two places:
- A literal `{output_folder}` directory was created instead of `_bmad-output`.
- `_bmad/config.toml` and `_bmad/bmm/config.yaml` contain `{output_folder}` as a string in `planning_artifacts` and `implementation_artifacts`.

Fix: renamed the directory to `_bmad-output` and substituted the placeholder in both config files. Reported as a finding for the BMAD project; not a blocker.

### Per-agent log

#### 1. Analyst "Mary" — `bmad-product-brief`
- **Prompt summary:** `--autonomous` mode with the source PRD as input and locked stack constraints. Produce a project brief without re-elicitation.
- **Output:** `_bmad-output/planning-artifacts/project-brief.md`
- **What worked:** The skill's stage-4 draft template is well-shaped (executive summary, problem, target user, vision, scope, success criteria, constraints, risks, dependencies, hand-off). Following that structure produced a brief immediately useful to the PM step.
- **What was missing / iterated:** The skill defaults to a deeply collaborative, multi-question stage 1 ("Understand intent"). With locked constraints that's pure overhead — autonomous mode skipping it was the right call.
- **Human judgment load-bearing:** Picking which v1 exclusions to call out explicitly (edit-text, drag-reorder, etc.). The source PRD was vague; the brief had to be assertive.

#### 2. PM "John" — `bmad-create-prd`
- **Prompt summary:** Synthesize a PRD from brief + source PRD. Lock entity schema, operations, NFR thresholds, and epic outline so the Architect has unambiguous constraints.
- **Output:** `_bmad-output/planning-artifacts/prd.md`
- **What worked:** Frontmatter `stepsCompleted` array gave a clean way to record the 12-step skeleton without actually walking each menu interactively. FR-1 through FR-8 plus NFR-1 through NFR-12 produced a checkable surface area.
- **What was missing / iterated:** The skill's strict step-by-step protocol (with menus and `C` continuation) is a bad fit for headless / autonomous use. The skill could benefit from a `--yolo` mode like `bmad-product-brief` has.
- **Human judgment load-bearing:** Calling out edit-text-of-existing-todo as an open question rather than silently picking. Locking sort order to `created_at DESC`. Picking error-shape candidates (custom vs. RFC 7807) for Architect to decide.

#### 3. Architect "Winston" — `bmad-create-architecture`
- **Prompt summary:** With the PRD and locked stack, produce a comprehensive architecture document with diagrams, ERD, OpenAPI contract, env schema, and ADRs.
- **Output:** `_bmad-output/planning-artifacts/architecture.md`
- **What worked:** Concentrating the open decisions in numbered ADRs (ORM choice, optimistic-UI mechanism, error format, healthcheck shape, migrations on startup, monorepo vs. multi-repo) gives the Dev agent in Step 2 a clear `Why` for each choice. ASCII diagrams render fine in Markdown and don't require an external tool.
- **What was missing / iterated:** The skill expects to draft architecture conversationally with the user; in autonomous mode I had to self-supply the typical "what trade-offs are you OK with?" answers. Recorded as ADR rationale rather than glossed.
- **Human judgment load-bearing:** Choosing Drizzle over Prisma (smaller container, no codegen step). Choosing custom error shape over RFC 7807 (overhead not worth it for a one-team API). Choosing migrations-on-startup over a separate migrator service (simplicity wins for v1).

#### 4. PM/SM — Epics & E1 stories
- **Prompt summary:** Produce 5 epic files and fully-expanded stories for E1 only.
- **Output:** `_bmad-output/planning-artifacts/epics/E[1-5]-*.md` and `_bmad-output/planning-artifacts/stories/E1-S[1-5]-*.md`
- **What worked:** Splitting story drafting into "now" (E1) and "just-in-time during Step 2" (E2-E5) keeps stories fresh against the actual code state and avoids re-work when reality contradicts the plan. Story files use Given/When/Then ACs, three test levels, dependencies, and a Definition of Done — same shape `bmad-create-story` would produce.
- **What was missing:** No SM persona was invoked separately — PM-style epic outlining flowed directly into story files for E1.
- **Human judgment load-bearing:** Choosing 5 stories for E1 (not 3, not 10). Sequencing dependencies (S2/S3/S4 all depend on S1; S5 depends on S2-S4).

### What AI didn't / couldn't do well in Step 1

- **Discover skills installed mid-session.** Required manual workaround (reading `SKILL.md` and inlining).
- **Substitute the installer's `{output_folder}` template variable.** Required manual fix.
- **Decide tech versions without prompting.** Defaulted to outdated React 18 / Node 20 until corrected.

### Where human expertise was load-bearing in Step 1

- Calling out outdated default versions (React 18 → 19, Node 20 → 24).
- Choosing PostgreSQL sidecar over SQLite to honor the assignment's docker-compose multi-service requirement.
- Refusing to silently include "edit-text-of-existing-todo" — flagged as an open question rather than assumed.
- Catching that the BMAD installer left a literal `{output_folder}` directory.

---

## Step 2 — Build the application (E1 + E2 + E3)

### Tooling used in Step 2

| Tool | Purpose | Notes |
|---|---|---|
| Claude Code (Opus 4.7) | End-to-end implementation against the BMAD-generated stories | Worked from `_bmad-output/planning-artifacts/stories/E1-*.md` directly; E2 and E3 stories were drafted just-in-time per the plan |
| Drizzle Kit | DB schema → SQL migration | `npx drizzle-kit generate --name init` produced `0000_init.sql`; matched the architecture ERD on the first pass |
| Testcontainers (`@testcontainers/postgresql`) | Ephemeral PG per integration test run | Required `TESTCONTAINERS_RYUK_DISABLED=true` on Docker Desktop for macOS — Ryuk reaper fails to start; documented as setup file |
| `docker run postgres:16-alpine` (port 5434) | Local PG for E2E run | Step 4 will replace this with a Compose-managed db service |
| Playwright (Chromium) | E2E + a11y via `@axe-core/playwright` | webServer config spawns api (`tsx watch`) and vite dev server in parallel |

### Implementation log (per epic)

#### E1 — Project scaffolding (5 stories)

- **What worked:** The story files from Step 1 were detailed enough that scaffolding was almost mechanical: each story named the exact files, scripts, and configs to add. Total time on E1 was small.
- **What didn't:** Default Vitest `include` patterns picked up Playwright `*.spec.ts` files in `tests/e2e/`. Required explicit `exclude` in `vitest.config.ts`. Caught immediately by the first `npm test` run.
- **AI miss:** I initially set `rootDir: "./src"` in both `packages/api/tsconfig.json` and `packages/web/tsconfig.json`. That rejects sibling `tests/` files (E2E specs and integration test helpers). Removed `rootDir`. Story-level ACs didn't anticipate this — would update them.

#### E2 — Backend API

- **What worked:** Architecture's ADRs translated 1:1 into code. ADR-1 (Drizzle): `drizzle-kit generate` matched the ERD. ADR-3 (custom error envelope): single `errors.ts` + Fastify `setErrorHandler` covered every path. ADR-4 (`/healthz` always 200): made Compose's `depends_on: service_healthy` viable. Coverage: 87.34% line.
- **What didn't:** `pool.end()` was called twice when an integration test deliberately ended the pool to test `db: down`. Cleanup needed to be idempotent. Captured in `test-app.ts` helper.
- **Surprise:** Fastify rejects DELETE requests when the client sends `Content-Type: application/json` with no body (`FST_ERR_CTP_EMPTY_JSON_BODY`). Discovered only via Playwright — the integration tests use `app.inject()` which doesn't auto-set Content-Type, so they passed. **The integration tests didn't catch this; the E2E did.** Reinforces why both layers exist.

#### E3 — Frontend UI

- **What worked:** The split between TanStack Query (cache) and per-mutation optimistic onMutate was clean. The architecture's ADR-2 anticipated this. React 19's `useOptimistic` *wasn't* used in the end — TanStack Query's onMutate covered the same need with less plumbing for this small surface. Logging this as an architecture amendment: ADR-2 should be revised in a future iteration.
- **What didn't:**
  1. Testing Library's auto-cleanup didn't run between tests — the React 19 + Vitest 3 combination requires an explicit `afterEach(cleanup)` in the test setup file. Caused 7 cascading "found multiple elements" failures until added.
  2. Playwright's `.check()` action validates the checkbox state synchronously after click. With a controlled checkbox + async onMutate, the optimistic state update is a microtask later — so `.check()` saw the unchecked state and errored. Switched to `.click()` plus a visual-class assertion.
- **AI miss:** I included a `logger` field in `QueryClient` config (a v4 API removed in v5). TS caught it on the first typecheck.

### MCP servers used in Step 2

None invoked. The work was straightforward enough that direct file edits + bash commands sufficed. Step 4's QA pass will use Chrome DevTools MCP for performance auditing.

### What AI didn't / couldn't do well in Step 2

- **Predict the Fastify empty-body issue.** The error pattern is well-known but only triggers from a real fetch client, not Fastify's `inject()`. Would have required exhaustively reasoning about Content-Type semantics up-front.
- **Anticipate the controlled-checkbox + optimistic-update timing.** Common gotcha in async-React + Playwright; not in Drizzle/Fastify/Vite docs.
- **Pick perfect default versions in package.json.** `@types/node` versions kept drifting and `tsx watch` had transitive deprecation warnings.

### Where human expertise was load-bearing in Step 2

- Catching that `rootDir` would reject sibling tests folders.
- Recognising the Ryuk reaper issue from prior Testcontainers + macOS history.
- Diagnosing the `Content-Type` 400 from a Fastify log line — would have taken much longer purely from the Playwright failure message.
- Knowing to reach for `afterEach(cleanup)` rather than chasing JSDOM globals.

### Step 2 verification (run on 2026-04-27)

| Check | Result |
|---|---|
| `npm run lint` | ✓ clean |
| `npm run typecheck` | ✓ all three workspaces |
| `npm test` (60 unit/integration tests) | ✓ 14 shared + 27 api + 19 web |
| `npm run test:e2e` (8 specs: 6 functional + 2 a11y) | ✓ all pass |
| API line coverage | 87.34 % (≥70 % threshold) |
| Web line coverage | 96.29 % (≥70 % threshold) |
| Critical axe-core a11y violations | 0 |

---

## Step 3 — Containerization (Epic E4)

### Tooling used in Step 3

| Tool | Purpose | Notes |
|---|---|---|
| Claude Code (Opus 4.7) | Authored Dockerfiles, compose files, nginx config, persistence script; ran the smoke validation end-to-end | Auto mode |
| Docker 29.4 + Compose v5.1 | Local runtime | macOS host |
| `node:24-alpine` | Base for api runtime + dev images | |
| `nginx:1.27-alpine` | Production web tier (static SPA + reverse proxy) | |
| `mcr.microsoft.com/playwright:v1.48.0-jammy` | E2E runner image (browsers preinstalled) | Used by `docker-compose.test.yml` |
| `postgres:16-alpine` | Database | Named volume `bmad_todo_db_data` for persistence |

### Implementation log

#### E4-S1 — api Dockerfile

- **Decision recorded here, not in architecture:** run the api via `node --import tsx/esm src/server.ts` in production instead of compiling to `dist/`. Why: the `@bmad-todo/shared` package's `main` points at `src/index.ts`, so a `tsc` build of api would still need shared compiled or bundled. Running with `tsx` keeps the runtime story uniform with dev (`tsx watch`) and avoids a bundler decision that the architecture didn't take. `tsx` was moved from devDeps to deps to make the `--omit=dev` install valid.
- **Multi-stage:** `deps` (npm ci --omit=dev across all workspaces) → `runtime` (copy node_modules + source, `USER node`, `wget /healthz` healthcheck).
- **Migrations on startup:** unchanged from `src/server.ts` — `runMigrations()` runs before `app.listen()`. ADR-5 honored as-is.

#### E4-S2 — web Dockerfile + nginx.conf

- **Architecture said only `web` is exposed to the host.** That implies a same-origin story for the browser: nginx serves the SPA *and* reverse-proxies `/api/*` to `api:3000`. `proxy_pass http://api:3000/;` (trailing slash) strips the `/api` prefix on the way through. SPA's `VITE_API_BASE_URL=/api` is set as a build arg.
- **Side effect (positive):** because the browser sees same-origin for both SPA and API, CORS is never evaluated in the production path. The api still defaults `CORS_ORIGIN=http://localhost:8080` for defense-in-depth and for the dev workflow where Vite at :5173 talks to api at :3000.
- **SPA fallback** via `try_files $uri $uri/ /index.html`. Hashed assets get `Cache-Control: public, immutable`; `index.html` gets `no-store`.

#### E4-S3 — docker-compose.yml

- Only `web` published (`8080:80`). `api` and `db` remain on the default user-defined bridge.
- `depends_on: { condition: service_healthy }` for both `api → db` and `web → api`.
- `POSTGRES_PASSWORD` is a required interpolation (`:?POSTGRES_PASSWORD is required`) — fails fast if the user hasn't set it, instead of starting Postgres with an empty password.
- Named volume `bmad_todo_db_data` mounted at `/var/lib/postgresql/data`.

#### E4-S4 — Dev overlay (`docker-compose.dev.yml`)

- Separate `Dockerfile.dev` per service that installs *all* deps (devDeps included) so `tsx watch` and `vite` are available.
- Bind mounts: only the source paths, not the whole package — preserves the in-image `node_modules`. `CHOKIDAR_USEPOLLING=true` for reliable file watching on macOS bind mounts.
- Web exposes `5173`, api exposes `3000`; SPA hits api directly via `VITE_API_BASE_URL=http://localhost:3000` in dev (CORS allowed by the api default).

#### E4-S5 — Test overlay (`docker-compose.test.yml`) + `Dockerfile.e2e`

- Added `E2E_EXTERNAL_STACK=1` env flag in `playwright.config.ts` to skip Playwright's own `webServer` when the api/web are already up under Compose. Without this, the runner would try to spawn its own dev servers inside the runner container.
- `e2e` service depends on `web` *and* `api` being healthy; uses `--exit-code-from e2e` so CI bubbles the playwright result.

#### E4-S6 — Persistence script (`scripts/test-persistence.sh`)

- Bash script that scripts the full lifecycle: `down -v` → `up --build` → wait healthy → `POST /api/todos` with a timestamped marker → `down` (preserve volume) → `up` → wait healthy → `GET /api/todos` and assert marker present.
- Runs against the host-published `web` port (`localhost:8080/api/...`). Architecture said the persistence test was an "E2E test"; doing it as a script (not a Playwright spec) was a deliberate scope call — driving compose lifecycle from inside Playwright is a fight, and a script with `set -euo pipefail` is the right tool.

### What worked / didn't / surprises in Step 3

- **Worked:** the architecture's nginx-as-reverse-proxy decision is the keystone — once that's nailed down everything else (CORS, port exposure, env var choice) follows. Compose `depends_on: service_healthy` plus the api's `/healthz` probe (which always returns 200, ADR-4) gave clean startup ordering on the first try.
- **Didn't (fixed):** initial instinct was to bundle the api with esbuild, then with `tsc`, then to compile shared separately. Each option had a small wart. The `tsx`-in-prod path was the simplest *and* the closest to dev. Captured here because the architecture didn't take a position on the build mode; future maintainers should know.
- **Surprise:** Compose `--exit-code-from e2e` requires `--abort-on-container-exit` — the README has both, would have wasted a few minutes otherwise.
- **AI miss:** initially placed `.dockerignore` inside `packages/api/`. Build context is the repo root, so Docker ignored it. Caught at validation time, moved to root and broadened patterns.

### Where human expertise was load-bearing in Step 3

- Recognising that "only `web` exposed" implies an nginx reverse-proxy rather than baking the api host into the SPA bundle. The architecture states the constraint but doesn't spell out the proxy pattern.
- Anticipating that the `tsc -b` step in `packages/web/build` would emit unwanted JS — the Dockerfile bypasses it with `npx vite build` directly.
- Choosing to move `tsx` from devDeps to deps rather than running `npm ci` without `--omit=dev` in the runtime image (smaller image, principle-of-least-privilege).

### Step 3 verification (run on 2026-04-29)

| Check | Result |
|---|---|
| `docker compose config` (prod, dev, test overlays) | ✓ all three validate |
| `docker compose build` | ✓ both images |
| `scripts/test-persistence.sh` | ✓ marker survived `down → up` |
| Stack startup ordering | ✓ `db (Healthy) → api (Healthy) → web (Started)` |
| Browser → SPA → `/api` proxy → api → db round-trip | ✓ via persistence-script POST/GET |

---

## Step 4 — QA & Hardening (Epic E5)

### Tooling used in Step 4

| Tool | Purpose | Notes |
|---|---|---|
| Vitest v8 coverage | Threshold gating (70% line/branch/function/statement) | Already wired during Step 2; verified in Step 4 |
| `@axe-core/playwright` | a11y assertion as part of E2E | Already integrated; runs against empty + populated views |
| Claude Code (Opus 4.7) | README authoring; AI integration log finalization | This document |

### Implementation log

#### E5-S1 — Coverage thresholds + report

- Already configured in Step 2 (`packages/api/vitest.config.ts`, `packages/web/vitest.config.ts`).
- Re-run on 2026-04-29: api 87.34% line / 78.37% branch / 27 tests pass; web 96.29% line / 89.65% branch / 19 tests pass; shared 100% / 14 tests pass. All thresholds satisfied.

#### E5-S2 — axe-core integration

- Already integrated in `packages/web/tests/e2e/a11y.spec.ts` (Step 2). Two specs: empty state and populated list. Both filter on `impact === "critical"` and assert zero. Tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`.

#### E5-S3 — Lighthouse perf audit

- **Done.** Full report in `docs/qa/performance.md`; raw JSON + HTML in `docs/qa/lighthouse*.report.*`.
- **Result (unthrottled host loopback):** Performance 100 / Accessibility 100 / Best-Practices 100. TTI 57 ms, TBT 0 ms, CLS 0. Host benchmarkIndex 4064 (Lighthouse "mid-range desktop" reference ≈1000) — even normalized for the slower target machine, TTI lands ~10× under the 2 s NFR-3 gate. **NFR-3: PASS.**
- **Result (lab simulate, default Slow 4G + 1× CPU):** Performance 72, TTI 2.6 s, TBT 0 ms. Recorded as a regression boundary; **not** the NFR-3 number. Simulate's dependency-graph latency model floors TTI ≈2.6 s for any tiny SPA regardless of CPU multiplier (a 4× CPU pass produced an identical 2552 ms TTI), and TBT = 0 confirms the figure is not driven by real main-thread work.
- **MCP finding (load-bearing):** Architecture planned this audit through the Chrome DevTools MCP. The MCP server (`chrome-devtools-mcp`) was installed mid-session and showed Connected in `claude mcp list`, but its tools did not register in the live session — same lifecycle limitation Step 1 documented for skills. Worked around with `npx lighthouse@13.1.0` directly; output is the same JSON/HTML the MCP would emit. **Confirmed on a `/clear`-restarted session (2026-04-29):** MCP tools register on a fresh session, the architected pathway works end-to-end. Re-run produced LCP 70 ms (CDP `performance_start_trace`) and A11y 100 / BP 100 / SEO 91 (MCP `lighthouse_audit`) — same NFR-3 PASS verdict as the npx fallback.
- **MCP pathway is two calls, not one:** the MCP `lighthouse_audit` tool *excludes* performance by design (its docstring directs callers to `performance_start_trace`). The architecture's "Lighthouse via Chrome DevTools MCP" is actually `performance_start_trace` (LCP/CLS/INP) + `lighthouse_audit` (a11y/best-practices/SEO). Worth noting in the playbook.
- **MCP filename quirk:** `performance_start_trace` appends `.json.gz` to whatever `filePath` you pass. Requesting `cdp-trace.json.gz` produced `cdp-trace.json.json.gz` on disk. Pass the bare basename (e.g. `cdp-trace`) or rename after.
- **New SEO finding via MCP-pathway run:** `robots-txt` invalid (drops SEO 100 → 91). Cause: nginx SPA fallback returns `index.html` for `/robots.txt`. Honest finding, not a blocker for an internal app; fix is a static `web/public/robots.txt`. The npx-lighthouse run did not surface it because `--only-categories=performance,accessibility,best-practices` excluded SEO.
- **Bug found in user MCP config:** the locally-configured `chrome-devtools` server pointed at `npx @modelcontextprotocol/server-chrome-devtools`, which is a 404 on npm. Fixed in `~/.claude.json` (project-scoped) to `npx -y chrome-devtools-mcp@latest`. Server now connects.

#### E5-S4 — Security review

- **Done.** Full report in `docs/qa/security.md`; raw diff under review in `_bmad-output/implementation-artifacts/security-review-diff.patch`.
- **Method:** `bmad-code-review` with three parallel adversarial layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) all on Opus 4.7 with isolated context. Diff scope: commits f945974..1b4cafa, security-relevant slice only (api source, web client/api, nginx.conf, Dockerfiles, docker-compose*.yml, .env.example, SQL migrations) — 39 files / 1,613 lines.
- **Verdict:** PASS with patch list. **No exploitable critical issues** for the v1 deployment profile (single-user, internal). The hardening posture is consistent with NFR-11's stated v1 scope ("no auth in v1; CORS restricted to configured origin").
- **Findings:** ~36 unique after dedupe across the three layers. 11 High (info-disclosure / availability / unbounded surface), ~15 Medium (defense-in-depth), ~14 Low (mostly already deferred or cosmetic). Six new entries appended to `_bmad-output/implementation-artifacts/deferred-work.md` under "Deferred from: code review of E5-S4 security review (2026-04-29)".
- **Out-of-scope-per-NFR-11 callouts:** Blind Hunter raised auth, CSRF, and tenant model as Critical/High. Acceptance Auditor correctly classified them as explicit non-goals for v1. Documented in security.md under "Out of scope per spec — flagged for future revisits" so the next reviewer (post-auth) can pick up the trail.
- **Three-layer parallel review observations:**
  - **Spec-aware Auditor was the most load-bearing layer** for distinguishing real gaps from intentional v1 trade-offs. Without it, ~15 findings would have read as Critical/High that NFR-11 explicitly accepts.
  - **Blind Hunter (no project context)** caught the "what's missing" framing — auth, CSRF, HSTS, digest-pinning. Even when those land in the out-of-scope bucket, surfacing them in this review's record means the next-epic reviewer doesn't have to re-derive them.
  - **Edge Case Hunter (path tracer)** owned the timeout and reflection findings (pg.Pool timeouts, Fastify timeouts, shutdown timeout, x-request-id reflection, healthcheck timeout) — these are mechanical findings the prose-driven reviewers missed.
  - All three returned in 100–110 s. No subagent failures.
- **Architecture spec deviation flagged:** Architecture § 11 unconditionally requires `USER nginx` on the web container; the current image defers to D1. Either lift the deferral or reword the architecture to match. Added as a doc-fix entry in `deferred-work.md`.
- **Patch sweep (option A) — DONE (2026-04-29):** All 11 High and 11 actionable Medium findings applied in a single pass (M10/M12 already deferred per D7/F3). 22 patches across 13 files: `app.ts`, `env.ts`, `db/client.ts`, `db/migrate.ts`, `server.ts`, `log-redact.ts` (new), `routes/todos.ts`, `routes/health.ts`, `web/src/api/client.ts`, `nginx.conf`, `.env.example`, `docker-compose.yml`, `docker-compose.dev.yml`. Two new test files (`tests/unit/log-redact.test.ts`, four new env validation cases) raised api coverage to 90.3% line / 79.5% branch. Verification matrix: 68 tests pass, `nginx -t` clean, `docker compose up --build --wait` healthy, persistence script PASS, 9-case live curl smoke against the running stack — every assertion green. See `docs/qa/security.md` § "Patch sweep — what landed where" for the per-finding file list.

#### E5-S5 — AI integration log finalization

- This document. Step 3 + Step 4 sections appended.

#### E5-S6 — README

- `README.md` written. Sections: quick start, local dev, hot-reload via Compose, testing matrix, e2e against the containerized stack, persistence check, architecture-in-one-paragraph, repo layout, env var matrix, AI integration pointer.

### What AI didn't / couldn't do well in Step 4

- **Run Lighthouse without an MCP server or external CLI.** Even with a running stack and a reachable port, there is no built-in audit tool — requires either Chrome DevTools MCP or a manual `npx lighthouse` run + JSON capture. Both pathways were exercised this step; both produce the same NFR-3 PASS verdict.
- **Use a freshly-installed MCP server in the session that installed it.** MCP tools register at session start; a mid-session `claude mcp add` shows "Connected" but the tools don't dispatch until `/clear` (or a session restart). Same lifecycle as skill registration. Workaround pattern: install MCP → `/clear` → use.
- **Self-evaluate security.** I can run `bmad-code-review`, but the value of an adversarial review depends on the reviewer being a different model run with a fresh window. A self-review tends to confirm what was just written.

### Where human expertise will be load-bearing in Step 4 (still ahead)

- Triaging the security findings from `bmad-code-review` — some will be principle-of-least-privilege nits (run nginx as non-root user, drop capabilities) and need a judgment call between cost-of-change and value-of-fix.
- Choosing whether the Lighthouse perf number is acceptable — `useOptimistic` was deferred in favor of TanStack Query optimistic mutations (Step 2 finding), so first-paint metrics may differ from what the architecture anticipated.

### Step 4 verification (run on 2026-04-29)

| Check | Result |
|---|---|
| `npm run test:coverage` (all workspaces) | ✓ shared 100%, api 87.34%, web 96.29%; 60 tests |
| Coverage thresholds (70% gate) | ✓ all pass |
| axe-core critical violations on `/` | ✓ 0 (Step 2 result; not re-run, surface unchanged) |
| `README.md` | ✓ committed |
| AI integration log | ✓ Step 3 + Step 4 sections appended |
| Lighthouse perf (npx fallback) | ✓ Perf 100 / A11y 100 / BP 100 unthrottled; TTI 57 ms vs 2 s NFR-3 gate (`docs/qa/performance.md`) |
| Lighthouse perf (Chrome DevTools MCP, architected pathway) | ✓ LCP 70 ms / CLS 0 / A11y 100 / BP 100 / SEO 91 (`docs/qa/cdp-lighthouse/`, `docs/qa/cdp-trace.json.gz`); same NFR-3 PASS |
| Security review | ✓ PASS with patch list (`docs/qa/security.md`); 11 High / ~15 Medium / ~14 Low after triage; no exploitable critical for v1 profile |
| Security patches applied (option A sweep) | ✓ 22 patches across 13 files; 68 tests pass; api coverage 90.3% / 79.5%; live stack smoke test all-green |
| Post-sweep cleanup pass | ✓ Playwright e2e against patched prod stack 8/8 green (after fixing pre-existing hardcoded URLs in `a11y.spec.ts`); dev overlay `depends_on` bug fixed (api healthcheck disabled but web required `service_healthy` — web could never start); api hot-reload confirmed via tsx-watch SIGTERM/restart on file change; architecture.md § 11 reworded to qualify the non-root requirement; L11 marked verified; README documents `BIND_HOST` and `API_PORT`; H6 "bigger fix" (separate migration role) added to deferred-work; transient `security-review-diff.patch` removed (reproducible from `git diff`) |

---

## Step 5 — Post-shipping defects (2026-04-29, same-day)

After the project retrospective was filed (`_bmad-output/implementation-artifacts/project-retrospective-2026-04-29.md`), exercising the README's local-dev path and the dev overlay end-to-end surfaced **four latent defects** that the E5 verification matrix did not catch. All four were fixed and committed the same day. Recording them here because the pattern matters: every advertised path needs a fresh smoke test, not just the path that was being walked during development.

### 5.1 — Dev overlay merged port lists instead of replacing them
**Symptom:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` failed with `Bind for 127.0.0.1:8080 failed: port is already allocated`. `lsof` and `netstat` showed nothing on 8080. A standalone `docker run -p 127.0.0.1:8080:8080 alpine` succeeded — the daemon could bind 8080. The error was misleading.

**Root cause:** Compose **merges** ports lists when overlays add to a service that already has a `ports:` entry. Base `docker-compose.yml` mapped `web` to `${WEB_PORT:-8080}:80` (nginx). The dev overlay ALSO mapped `web` to `${WEB_PORT:-8080}:5173` (vite). The merge produced two host bindings on the same port for the same container — the first allocation succeeded, the second failed. The error message blamed the host port, but the conflict was internal to the container's port table.

**Fix:** `ports: !override` directive in the dev overlay's web service so the list is replaced, not merged. Compose 2.20+. Commit `1558cd6`.

**Lesson:** the prior cleanup (commit `2f3388a`) fixed a `depends_on` bug that prevented web from starting at all. Once web could start, this latent ports-merge bug surfaced — the previous bug was masking it. **One fix exposing the next** is a classic post-completion pattern.

### 5.2 — Local-dev `.env` was never loaded by the api
**Symptom:** `npm run -w @bmad-todo/api dev` failed with `invalid environment: DATABASE_URL: Required`, even with `.env` present at the repo root.

**Root cause:** The api reads `process.env` directly with no `dotenv` loader. Compose works because `environment:` blocks inject vars into the container. Local-dev never had a loader. The README's local-dev section claimed the workflow worked; it did not.

**Fix:** Added `--env-file-if-exists=../../.env` to the `dev` and `db:migrate` scripts in `packages/api/package.json`. Node 24's flag, tolerates missing file, so it's a no-op when running inside the dev overlay (which has env from Compose). Commits `1558cd6` (initial) and `477133c` (flag-order fix — `tsx watch` is a subcommand, Node flags forwarded by tsx must come *after* `watch`, otherwise `watch` is interpreted as the script path).

**Lesson:** the architecture explicitly chose "no dotenv runtime dep" — but the local-dev path needed *some* env-loading mechanism. The architectural choice was right; the README claimed something the code didn't deliver. **Architectural decisions need at least one verified path that exercises them per environment** (Compose: ✓; local-dev: missed).

### 5.3 — `CORS_ORIGIN` was single-origin, not a list
**Symptom:** SPA at `http://192.168.0.233:5173` (vite's "Network" URL — what vite shows by default alongside the localhost URL) fetched the api at `localhost:3000` and got blocked: `Access-Control-Allow-Origin: http://localhost:8080` didn't match the request's origin.

**Root cause:** `env.ts` validated `CORS_ORIGIN` as a single string. Default was `http://localhost:8080` (matches the prod nginx port). The README claimed the local-dev path "(CORS allows it)" — false: vite is on `:5173`, default allowlist was `:8080`. Anyone accessing via vite's Network URL was double-blocked.

**Fix:** `env.ts` now parses `CORS_ORIGIN` as a comma-separated list, validates each entry individually (regex + wildcard rejection unchanged), exports `string[]`. `@fastify/cors` accepts an array natively, so `app.ts` is unchanged. `.env.example` seeds `http://localhost:8080,http://localhost:5173` as the typical dev allowlist. Two new tests cover the multi-origin path. Commit `5c506fa`.

**Lesson:** every NFR-level constraint ("single origin only") that ships as `string` will eventually need to be a list. **The cost of `string | string[]` upfront is one Zod transform; the cost of changing it later is a coordinated edit across env, config, plugin call, tests, and docs.** That said, doing it eagerly is also a YAGNI smell — the right policy is probably "ship `string` if there's no current list use case, and budget the migration when the second use case appears."

### 5.4 — Diagnostic chase on a misleading Docker error
**Not a defect, but a recorded time-loss pattern.** The `Bind for 127.0.0.1:8080 failed: port is already allocated` message in 5.1 sent the investigation toward "what's holding the port" — `lsof`, `netstat`, container scans, prune commands, even bind-host swaps. None of that helped because nothing external was holding the port; the container was double-binding to itself. The fix only became visible after re-reading both compose files side-by-side.

**Lesson:** when a Docker error surface implicates the *host* (port allocation, network, etc.) but host inspection turns up nothing, the next hypothesis should be **the container's own port table**, not "stale Docker state" — which is the seductive misdirection because it's plausible and untestable. Pattern: `docker compose config` resolves overlays into the merged service definition; reading the resolved `ports:` list there is the fastest way to spot a double-bind.

### Cumulative defect count (Epic E1–E5 declared complete → Step 5 close-out)

| Defect | Found by | Severity | Fix commit |
|---|---|---|---|
| Dev overlay `depends_on: service_healthy` with disabled api healthcheck | Post-sweep manual run | Medium | `2f3388a` (predates Step 5) |
| Dev overlay ports-list merge (web double-binds host port) | Step 5 dev-overlay smoke | Medium | `1558cd6` |
| Local-dev script doesn't load `.env` | Step 5 local-dev smoke | Medium | `1558cd6` + `477133c` |
| `CORS_ORIGIN` single-origin only | Step 5 LAN-URL access from browser | Low / Medium (UX, not security) | `5c506fa` |

**Pattern across all four:** none were caught by the test suite or the security review because none of them are *unit-testable defects* — they're contract drift between (a) the README's advertised paths and (b) the actual code. **Smoke-running every advertised path is a category of work that the test suite cannot replace.** Add this as a permanent post-completion checklist item in any future BMAD-driven project, alongside the existing per-epic verification matrix.

### Step 5 verification (run on 2026-04-29)

| Check | Result |
|---|---|
| Dev overlay (`docker compose -f docker-compose.yml -f docker-compose.dev.yml up`) | ✓ all three services healthy; SPA on `:8080`, api on `:3000`, hot-reload working |
| Local-dev path (`npm run -w @bmad-todo/api dev` + `npm run -w @bmad-todo/web dev`) | ✓ env loaded from `.env`; api connects to host Postgres; SPA hits api with no CORS rejection |
| `npm run -w @bmad-todo/api typecheck` | ✓ clean |
| Updated env unit tests (`tests/unit/env.test.ts`) | ✓ 10/10 (8 prior + 2 new for multi-origin) |
| README local-dev section reflects what actually works | ✓ |
