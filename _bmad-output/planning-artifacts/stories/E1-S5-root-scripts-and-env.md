# E1-S5 — Root scripts, .env.example, .gitignore

**Epic:** E1 — Project Scaffolding
**Status:** ready
**Estimated:** S
**Blocked by:** E1-S2, E1-S3, E1-S4

## User value

> "I want one canonical command for each chore — lint, typecheck, test, build — so contributors don't memorize per-package quirks."

## Acceptance criteria

**Given** the root `package.json`
**When** I list its scripts
**Then** I see at minimum: `lint`, `lint:fix`, `format`, `typecheck`, `test`, `test:coverage`, `test:e2e`, `build`

**Given** I run `npm run typecheck` at the root
**When** all workspaces pass type checking
**Then** the command exits 0
  And it runs in every workspace (via npm workspaces)

**Given** I run `npm run build` at the root
**When** each workspace's build script (placeholder for now: `tsc --noEmit` or `vite build` once present) completes
**Then** the root command exits 0

**Given** the repo has `.env.example`
**When** I read it
**Then** every variable from architecture § 7 is present with a comment, and no real secret is checked in

**Given** `.gitignore`
**When** I inspect it
**Then** it excludes `node_modules/`, `dist/`, `.env`, `.env.local`, `coverage/`, `playwright-report/`, `.eslintcache`, `_bmad/.cache/`, `.DS_Store`

## Implementation notes

- Root `package.json`:
  ```json
  {
    "scripts": {
      "lint":          "eslint \"packages/*/src/**/*.{ts,tsx}\"",
      "lint:fix":      "eslint \"packages/*/src/**/*.{ts,tsx}\" --fix",
      "format":        "prettier --write \"packages/*/{src,tests}/**/*.{ts,tsx,css,md,json}\"",
      "typecheck":     "npm run typecheck --workspaces --if-present",
      "test":          "npm run test --workspaces --if-present",
      "test:coverage": "npm run test:coverage --workspaces --if-present",
      "test:e2e":      "npm run test:e2e --workspace=@bmad-todo/web",
      "build":         "npm run build --workspaces --if-present"
    }
  }
  ```
- Each workspace defines `typecheck`, `test`, and (where applicable) `build`.

## Test scenarios

| Level | Scenario |
|---|---|
| Unit | n/a |
| Integration | Every root script exits 0 on a clean checkout |
| E2E | `test:e2e` runs the smoke spec from S4 and passes |

## Dependencies

- E1-S2, E1-S3, E1-S4

## Definition of Done

- All ACs pass
- `npm install && npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build` is green from a fresh clone
- `.env.example` and `.gitignore` are committed; `.env` is not
- Epic E1 closed; ready to hand off to SM for E2 story drafting
