# Epic E1 — Project Scaffolding

**Goal:** Create the monorepo skeleton, toolchain, and test runners so subsequent epics can land code without re-litigating layout, formatting, or test wiring.

**Outcome:** A repo where `npm install && npm run lint && npm run test && npm run build` succeeds, even though there is no application logic yet.

## Acceptance criteria (epic-level)

- npm workspaces configured for `packages/shared`, `packages/api`, `packages/web`
- TypeScript strict mode in every workspace, sharing a `tsconfig.base.json`
- ESLint + Prettier configured at the root, runnable via `npm run lint` and `npm run format`
- Vitest wired in `shared`, `api`, `web` — each has a sample passing test
- Playwright wired in `web` — at least one trivial spec that opens `about:blank` passes
- Root `package.json` exposes: `lint`, `lint:fix`, `format`, `test`, `test:e2e`, `build`, `typecheck`
- `.gitignore` covers `node_modules/`, `dist/`, `.env`, `playwright-report/`, `coverage/`
- `.env.example` exists with documented variables from architecture § 7

## Stories

- E1-S1 — Initialize npm workspaces + base TS config
- E1-S2 — Add ESLint + Prettier
- E1-S3 — Wire Vitest in all three workspaces
- E1-S4 — Wire Playwright in `packages/web`
- E1-S5 — Root package scripts + .env.example + .gitignore

## Out of scope for E1

- Application code (todos, db, components) — comes in E2 / E3
- Dockerfiles — E4
- CI configuration — E5

## Definition of Done

All five stories complete with their ACs satisfied, and a clean run of `npm install && npm run lint && npm run typecheck && npm run test` from a fresh checkout. No Playwright spec failures.
