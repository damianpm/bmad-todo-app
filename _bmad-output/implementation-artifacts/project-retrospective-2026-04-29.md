---
generated: 2026-04-29
scope: whole project — Epics E1 through E5
participants: Damian (project lead), Mary (Analyst), John (PM), Winston (Architect), Amelia (Dev), Paige (Tech Writer)
related:
  - docs/ai-integration-log.md
  - _bmad-output/implementation-artifacts/code-review-findings.md
  - _bmad-output/implementation-artifacts/deferred-work.md
---

# Project retrospective — `bmad-todo-app`

A single-developer, full-stack todo app built end-to-end by a Claude Code session driving BMAD personas, in five epics over two working days (2026-04-27 → 2026-04-29). This retrospective looks at the whole arc rather than one epic, because the project was always scoped as a closed unit: PRD → architecture → epics → code → containers → QA, then stop.

## 1. Outcome at a glance

| Dimension | Result |
|---|---|
| Epics completed | 5 / 5 (E1 scaffolding, E2 API, E3 UI, E4 containers, E5 QA & hardening) |
| Stories completed | 28 / 28 (E5-S6 README — optional polish — partially done; screenshots added 2026-04-29) |
| Unit + integration tests | 68 passing (shared 14 / api 27+ / web 19) |
| Coverage (api / web / shared) | 90.3% / 96.29% / 100% line — all over the 70% gate |
| Critical a11y violations on `/` | 0 |
| NFR-3 (TTI < 2 s) | TTI 57 ms unthrottled; LCP 70 ms via CDP — ~35× under gate |
| Security review | PASS for v1 profile after 22-patch sweep; 11 High / ~15 Medium / ~14 Low triaged |
| Persistence test | `down → up → data still there` ✓ |
| Production stack | Three Compose services, only `web` exposed, named volume for `db` |

Everything in the PRD's functional and non-functional surface was met. The deferred-work backlog (eight items) is consciously chosen out-of-scope for v1 single-user / single-host, with explicit reactivation triggers ("first multi-tenant or internet-reachable deployment").

## 2. What went well — patterns to repeat

### 2.1 BMAD's PRD → architecture → epics → stories pipeline translated almost mechanically into code
The architecture's ADRs (Drizzle vs Prisma, custom error envelope vs RFC 7807, `/healthz` always-200, migrations on startup, monorepo) were already framed as decisions with a recorded *why*. Each one cashed out as a 1:1 code shape during E2/E3, and Compose's `depends_on: service_healthy` worked on the first try in E4 because ADR-4 anticipated it.

**The keystone:** ADR-driven architecture moves the "why" upstream of the code. The Dev agent never had to re-derive a justification mid-implementation.

### 2.2 Just-in-time story drafting after E1
Step 1 fully expanded E1's stories but left E2-E5 at the epic level. E2-E5 stories were drafted right before each epic started. Two payoffs: stories stayed fresh against actual code state (E3 stories knew that React 19's `useOptimistic` had been deferred, for instance), and there was zero re-work from plan-vs-reality drift.

**Anti-pattern this dodged:** writing 30 stories upfront and discovering most need rewriting after the first three.

### 2.3 Three-layer adversarial security review in E5-S4
`bmad-code-review` ran three personas in parallel on Opus 4.7 with isolated context — Blind Hunter (no project context), Edge Case Hunter (path tracer), Acceptance Auditor (spec-aware). All three returned in 100-110 s. ~36 unique findings after dedupe.

The **spec-aware Auditor was the most load-bearing layer**: without it, ~15 findings reading as Critical/High would have triggered scope creep into things NFR-11 explicitly accepted as v1 trade-offs (no auth, no CSRF, no tenant model). The Edge Case Hunter caught mechanical gaps the prose-driven reviewers missed (pg.Pool timeouts, Fastify timeouts, x-request-id reflection). The Blind Hunter raised "what's missing" framing — auth, CSRF, HSTS, digest-pinning — useful even when classified out-of-scope, because the next reviewer doesn't have to re-derive them.

**The pattern:** never ship a security review with one persona. Always pair an unconstrained adversary with a spec-aware filter, plus a path-tracer for mechanical defects.

### 2.4 The `decision-needed / patch / defer / dismiss` triage
E4's code review came back with 44 findings. Triaging into four explicit buckets — with `defer` items promoted to a `deferred-work.md` file structured as `What / Why / When to reconsider` — gave the project a clean exit valve for "real but not now." The deferred-work file is the natural input for a future hardening pass; nothing is lost.

### 2.5 Test pyramid pulled its weight on real defects
Integration tests caught most defects, but at least one non-trivial bug only surfaced at E2E: Fastify rejects DELETE with `Content-Type: application/json` and no body (`FST_ERR_CTP_EMPTY_JSON_BODY`). Integration tests use `app.inject()` which doesn't auto-set Content-Type; only Playwright did. **The integration tests didn't catch this; the E2E did.**

**The pattern:** keep both layers even when integration coverage looks high. They cover different failure modes.

### 2.6 Architecture's "only `web` exposed" constraint forced the right shape
The PRD/architecture said only the web container is published to the host. That single constraint made nginx-as-reverse-proxy obvious; from there, same-origin browser → SPA + `/api` proxy meant **CORS is never evaluated in the production path**. The api still defaults `CORS_ORIGIN=http://localhost:8080` for dev-mode and defense-in-depth, but the production attack surface is smaller because the constraint cascaded.

### 2.7 NFR-3 (TTI < 2 s) was crushed
TTI 57 ms unthrottled, LCP 70 ms via the architected CDP pathway. The product surface is small enough that this was almost free, but the perf budget existed and was measured in two ways (npx lighthouse + Chrome DevTools MCP) — both produced the same PASS verdict, which validates the architected pathway as reproducible.

## 3. What didn't — friction and recurring failure modes

### 3.1 The "skill / MCP installed mid-session is silently inert" pattern (bit us twice)
**Step 1:** BMAD skills installed by `npx bmad-method install` landed in `.claude/skills/<name>/SKILL.md` but didn't register in the live session. Workaround: read each `SKILL.md` and execute its instructions inline as Claude playing the persona. Output identical because BMAD skills *are* prompt files.

**Step 4:** Chrome DevTools MCP installed mid-session showed Connected in `claude mcp list` but its tools didn't dispatch. Same lifecycle — registration happens at session start. Worked around with `npx lighthouse@13.1.0` directly. Confirmed on a `/clear`-restarted session that the architected pathway then works end-to-end.

**Lesson:** install-time and use-time are different sessions. The pattern for any future BMAD project: install skills/MCPs → `/clear` → use. This is not documented anywhere prominent and ate iteration time twice.

### 3.2 BMAD's interactive skills don't have an autonomous mode
`bmad-create-prd`, `bmad-create-architecture`, and a couple of others expect a 12-step menu walk with `C` continuation. In a non-interactive Claude session, that's friction. `bmad-product-brief` had `--autonomous`; the other two did not, and the workflow had to self-supply "what trade-offs are you OK with?" answers, recorded as ADR rationale rather than glossed.

**Filed as upstream feedback.** A `--yolo` flag matching `bmad-product-brief`'s shape would have been zero-cost to use.

### 3.3 BMAD installer left an unsubstituted `{output_folder}` template
A literal `{output_folder}` directory got created instead of `_bmad-output`, and `_bmad/config.toml` plus `_bmad/bmm/config.yaml` had `{output_folder}` as a string in `planning_artifacts` and `implementation_artifacts`. Manual fix required.

**Filed as upstream finding.** Not a blocker but a real smell.

### 3.4 Recurring class of problem: "config-default ate my files"
Three near-identical defects, one per epic:
- **E1:** Vitest's default `include` patterns swallowed Playwright's `*.spec.ts` files in `tests/e2e/`. Required explicit `exclude` in `vitest.config.ts`.
- **E1:** `rootDir: "./src"` in `packages/{api,web}/tsconfig.json` rejected sibling `tests/` files. Removed `rootDir`.
- **E4:** `.dockerignore` placed inside `packages/api/`. Build context is the repo root, so Docker silently ignored it. Moved to root and broadened patterns.

**Through-line:** every modern toolchain has a default that's "obvious" in isolation but breaks the moment your project has more than one workspace. Each defect cost ~10 min and was caught immediately on first run, but in aggregate they're a smell — when scaffolding a multi-workspace repo, these are the *first* configs to verify.

### 3.5 React 19 + Vitest 3 + Playwright async timing landmines (E3)
Two failures in close succession:
- Testing Library's auto-cleanup didn't run between tests on this combo. Required explicit `afterEach(cleanup)` in the test setup file. 7 cascading "found multiple elements" failures until added.
- Playwright's `.check()` validates checkbox state synchronously after click. With a controlled checkbox + async `onMutate`, the optimistic state update is a microtask later — `.check()` saw the unchecked state and errored. Switched to `.click()` plus a visual-class assertion.

**Through-line:** the React 19 + TanStack Query optimistic-mutation pattern is correct, but its async timing isn't covered by the well-traveled Playwright idioms. Reach for state assertions, not action validations.

### 3.6 `useOptimistic` was deferred — architecture ADR-2 owes an amendment
The architecture's ADR-2 anticipated React 19's `useOptimistic` for optimistic UI. In E3, TanStack Query's `onMutate` covered the same need with less plumbing for this small surface, so `useOptimistic` was dropped. The architecture document still claims `useOptimistic`. **This is a small but real plan-vs-code drift** that was logged in the AI integration log but not back-propagated to the architecture file.

### 3.7 Architecture spec deviation on `USER nginx`
Architecture § 11 unconditionally required `USER nginx` on the web container. The reality is that nginx's master process needs root to bind port 80, and switching the master to non-root requires re-binding — deferred per D1 hardening. The spec was reworded on 2026-04-29 to say "where possible (`USER node` is set on the api runtime; the web runtime uses the upstream `nginx:alpine` image whose master starts as root and forks workers as `nginx` — switching the master to non-root requires re-binding off port 80, deferred per D1)."

**The lesson:** architecture sections that read as universal absolutes ("must always X") will collide with deployment realities and need qualifying. A first-pass spec that says "where possible" with the rationale for any current deviation is more honest and harder to invalidate.

### 3.8 The AI couldn't self-evaluate security
Running `bmad-code-review` against your own diff in the same session is theater — the reviewer is the same model run that just wrote the code, and a self-review tends to confirm what was just written. The actual value came from spawning fresh Opus 4.7 subagents with isolated context as the three personas. **A security review needs a separate window to be worth running.**

## 4. Where human judgment was load-bearing

These are the moments AI couldn't have closed without the user. Worth recording so future sessions know where to interrupt.

- **Calling out outdated default versions** (React 18 → 19, Node 20 → 24) before they got embedded across configs.
- **Honoring the docker-compose multi-service requirement** by choosing PostgreSQL sidecar over SQLite. AI's first instinct was the simpler single-container path.
- **Refusing to silently include `edit-text-of-existing-todo`** in scope — flagged as an open question rather than assumed.
- **Catching the BMAD installer's `{output_folder}` directory** before it propagated.
- **Picking `Drizzle` over `Prisma`** (smaller container, no codegen step) and recording the trade-off.
- **Recognizing the Testcontainers + macOS Ryuk-reaper issue** from prior history. Diagnosing this purely from a Playwright failure message would have taken much longer.
- **Triaging security findings** between principle-of-least-privilege nits and real exploitable issues — the spec-aware persona helped, but the final accept/defer/patch call was a human cost-vs-value judgment.
- **Choosing whether the Lighthouse Simulate-mode 72 perf score was acceptable** when the unthrottled-host TTI of 57 ms was already crushing the NFR-3 gate. The Simulate floor (~2.6 s TTI for any small SPA regardless of CPU multiplier) is a property of Lighthouse's dependency-graph model, not the app — recognizing that needed someone who'd seen it before.

## 5. Cross-epic insights

### 5.1 The AI integration log paid for itself
`docs/ai-integration-log.md` was written incrementally during execution rather than reconstructed at the end. It is now the most useful single document in the repo for anyone trying to understand *how* this was built. **It was also the input that made this retrospective cheap to produce** — without it I'd have had to re-read every story and commit. Recommend this practice for any future agent-driven build.

### 5.2 The "what AI didn't / couldn't do" sections are the most actionable
Each epic's log has a "What AI didn't" section. Together these form a class of problems where AI hands the keyboard back to the human, and they cluster: prediction (Fastify content-type), self-evaluation (security), session lifecycle (skill / MCP registration), version defaults (outdated React/Node). **Future sessions should expect to budget human time for exactly these.**

### 5.3 "Containerization" was harder than it looked because the architecture made it easy
E4 was the smoothest epic by output but had the most micro-decisions buried in it (tsx-in-prod vs tsc, .dockerignore location, dev-as-overlay vs profile, persistence test as bash vs Playwright). Each decision was small in isolation. The reason E4 went smoothly is that the architecture's keystone decision — only `web` exposed, nginx as reverse proxy — collapsed the decision space for everything downstream. Most of E4 was elaboration of a single design choice. **The lesson: invest heavily in one or two architecture decisions that will cascade, rather than ten that won't.**

### 5.4 Coverage thresholds at 70% were the right gate
Final coverage was api 90.3%, web 96.29%, shared 100% — well over the 70% gate. The threshold was set deliberately low so that 100% never became the goal in itself; it became a backstop, not a target. This worked: tests were written for behaviors, not for coverage numbers, and the actual coverage came out high anyway.

## 6. Plan-vs-reality drift — what this project taught about BMAD

- **BMAD's strength:** the persona handoff and ADR-driven architecture turn an LLM-driven build into something with explicit reasoning visible at every layer. The artifact trail (`prd.md`, `architecture.md`, `epics/`, `stories/`, `code-review-findings.md`, `deferred-work.md`, `ai-integration-log.md`) tells a coherent story even six months from now.
- **BMAD's weakness for autonomous use:** every interactive skill assumes a human is at the keyboard answering menu prompts. Two of the four most-used skills (`bmad-create-prd`, `bmad-create-architecture`) require reverse-engineering an autonomous flow from a procedural one. `--yolo` mode would close this gap.
- **BMAD's session model is brittle.** Skill registration is one-way at session start; mid-session installs are silently inert. MCP servers behave the same way. This is not a BMAD bug strictly — it's Claude Code's lifecycle — but the BMAD install flow is the visible surface where it bites users.
- **What's missing:** a dedicated QA persona. The `agent-roster` config has Analyst, PM, UX, Architect, Tech Writer, Dev — no PO, no QA. QA work in E5 fell to Dev (Amelia) running adversarial reviews via `bmad-code-review` rather than a persona-led review. This worked, but a "Dana" QA persona would have been a natural fit, and the retrospective skill itself assumes one is present.

## 7. Action items

These are *consciously narrow*. The project is closed and there is no E6. The actions below are the ones that pay off either as feedback to BMAD upstream or as future-self instructions.

| # | Action | Owner | Trigger / when |
|---|---|---|---|
| 1 | File issue with BMAD upstream: skill installer leaves `{output_folder}` placeholder unsubstituted in two files | Damian | next time engaging with BMAD repo |
| 2 | File feedback with BMAD upstream: `bmad-create-prd` and `bmad-create-architecture` need a `--yolo` autonomous mode matching `bmad-product-brief`'s shape | Damian | next time engaging with BMAD repo |
| 3 | Update `architecture.md` ADR-2 to reflect that `useOptimistic` was dropped in favor of TanStack Query `onMutate` | (any) | already-known plan-vs-code drift; cosmetic, do during next maintenance pass |
| 4 | If this stack ever leaves a developer laptop: revisit `deferred-work.md` and budget the full hardening pass (D1 + D2 + D6 + D7 + L6 + L7 + L9 + H6 bigger fix). Eight items, all real. | (any) | first multi-tenant or internet-reachable deployment |
| 5 | Reusable practice: any future BMAD-driven project starts with a hard `/clear` after `npx bmad-method install` and after any `claude mcp add` | future-Damian | every BMAD project init |
| 6 | Reusable practice: when running adversarial code review, always combine an unconstrained reviewer with a spec-aware reviewer + a path-tracer. Single-persona review is theater. | future-Damian | every adversarial review |
| 7 | Reusable practice: keep the `ai-integration-log.md` updated incrementally during execution, not reconstructed at the end. It pays for itself at retrospective time. | future-Damian | every agent-driven project |

## 8. Readiness assessment — is the project really done?

| Dimension | Status |
|---|---|
| Stories complete | ✅ 28/28 (E5-S6 README polish optional; screenshots added 2026-04-29) |
| Tests | ✅ 68 passing across all workspaces; coverage well over the 70% gate |
| a11y | ✅ 0 critical violations on `/` |
| Performance | ✅ NFR-3 PASS via two independent measurement pathways |
| Security | ✅ PASS for v1 profile; high/medium findings patched, lows triaged |
| Persistence | ✅ named-volume survives `down → up` |
| Deployment | N/A by design — single-developer demo, not deployed anywhere |
| Stakeholder acceptance | N/A — this is a solo assignment-style build, no stakeholder review loop |
| Codebase health | ✅ stable; no flaky tests, no lurking known issues; 8 deferred items consciously chosen and reactivation-triggered |
| Unresolved blockers | None |

**Verdict:** project is genuinely complete for its declared scope. The `deferred-work.md` items are the honest "next epic" — not loose ends, but a recorded backlog gated on a deployment context that doesn't exist yet.

## 9. Closing

The headline insight from this build: **agent-driven delivery becomes legible when every persona's reasoning is captured as a written artifact, not just transient conversation.** ADRs, stories, code-review findings, deferred-work, ai-integration-log — all six artifacts exist as files in the repo, and together they let a stranger reconstruct the project's logic. That's the actual value of BMAD here, not the persona theater.

The headline frustration: session-lifecycle limitations cost iteration time twice (skills in Step 1, MCP in Step 4). It's a structural property of Claude Code, not BMAD specifically, but a single line in the BMAD install output ("`/clear` your session before using newly installed skills") would fix it for all users.

End of retrospective.
