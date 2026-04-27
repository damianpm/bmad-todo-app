# E1-S3 — Wire Vitest in shared / api / web

**Epic:** E1 — Project Scaffolding
**Status:** ready
**Estimated:** M
**Blocked by:** E1-S1

## User value

> "I need a test runner ready in every package so the next agent can write tests immediately, not configure tooling."

## Acceptance criteria

**Given** Vitest is installed at the root
**When** I run `npm test` from the root
**Then** Vitest runs in all three workspaces and all sample tests pass

**Given** a workspace runs `npx vitest run --coverage`
**When** the run finishes
**Then** a `coverage/` directory is generated with `lcov` and `text` reporters

**Given** the React test environment in `packages/web`
**When** a test imports `@testing-library/react` and renders a component
**Then** the test passes against `jsdom`

## Implementation notes

- Single root devDependency: `vitest`, plus `@vitest/coverage-v8`.
- For `packages/web`: also `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- Per-workspace `vitest.config.ts`:
  - `shared`: node env, coverage threshold 70 %.
  - `api`: node env, coverage threshold 70 %, will later wire Testcontainers in E2.
  - `web`: jsdom env, setup file imports `@testing-library/jest-dom`, coverage threshold 70 %.
- Sample tests:
  - `packages/shared/src/index.test.ts`: a trivial passing assertion.
  - `packages/api/src/sample.test.ts`: a trivial passing assertion.
  - `packages/web/src/sample.test.tsx`: render `<div>hello</div>` and assert text is present.
- Root `package.json` scripts:
  ```json
  "test":          "vitest run",
  "test:watch":    "vitest",
  "test:coverage": "vitest run --coverage"
  ```
  npm workspaces makes the root script run in each workspace that defines `test`.

## Test scenarios

| Level | Scenario |
|---|---|
| Unit | Sample tests in each workspace pass |
| Integration | `npm test` from root walks all three workspaces |
| E2E | n/a |

## Dependencies

- E1-S1

## Definition of Done

- All ACs pass
- Coverage thresholds set (even though current coverage will be 100 % of the sample line)
- No skipped or `.only` tests
