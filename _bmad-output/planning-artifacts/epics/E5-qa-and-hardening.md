# Epic E5 — QA & Hardening

**Goal:** Close the assignment's QA deliverables — coverage, accessibility, performance, security — and finalize the AI integration log.

**Outcome:** Satisfies NFR-4 through NFR-6 and NFR-11. Produces the QA reports that ship with the project.

## Acceptance criteria (epic-level)

- Coverage report shows ≥ 70 % line coverage in both `packages/api` and `packages/web`; gaps listed and either covered or documented as deliberate
- axe-core via Playwright reports zero critical violations on every primary view
- Lighthouse audit run via Chrome DevTools MCP on the running app; results captured in `docs/qa/performance.md`
- Security review pass using `bmad-code-review` covering common OWASP issues (XSS, SQL injection via Drizzle parametrization, CORS misconfig, secrets in source). Findings + remediations in `docs/qa/security.md`
- AI integration log (`docs/ai-integration-log.md`) is complete: per-agent prompts, what worked, what didn't, MCP servers used, where human judgment was load-bearing
- README finalized with: setup, `docker compose up`, test commands, env vars, "AI integration" section linking the log

## Out of scope for E5

- Penetration testing
- Load testing
- Threat modeling beyond the OWASP basics

## Stories

Drafted just-in-time. Likely shape:

- E5-S1 — Coverage thresholds in CI script + report generation
- E5-S2 — axe-core integration confirmed and gated
- E5-S3 — Lighthouse run + perf report
- E5-S4 — Security review run + report
- E5-S5 — AI integration log finalization
- E5-S6 — README polish + screenshots / GIFs (optional)
