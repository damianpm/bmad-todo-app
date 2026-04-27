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

(Steps 3 & 4 will append below.)
