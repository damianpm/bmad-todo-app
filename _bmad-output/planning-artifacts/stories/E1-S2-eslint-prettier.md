# E1-S2 — Add ESLint + Prettier

**Epic:** E1 — Project Scaffolding
**Status:** ready
**Estimated:** S
**Blocked by:** E1-S1

## User value

> "I want consistent style and obvious bug catches across the whole repo from day one."

## Acceptance criteria

**Given** the workspaces exist
**When** I run `npm run lint`
**Then** it runs ESLint across all `packages/*/src/**/*.{ts,tsx}` files
  And reports zero errors on the placeholder code

**Given** a file with formatting violations
**When** I run `npm run format`
**Then** Prettier rewrites it to the canonical format

**Given** I introduce an obvious bug (e.g. unused variable, missing return, `any` type)
**When** I run `npm run lint`
**Then** it fails with a clear pointer to the file and rule

## Implementation notes

- Use `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser`.
- React ESLint config (`eslint-plugin-react`, `eslint-plugin-react-hooks`) only inside `packages/web`.
- Prettier config: 100-char width, single quotes, no semis are fine — pick *one* defensible style and write it down.
- Disable rules that conflict with Prettier via `eslint-config-prettier`.
- Root scripts:
  ```json
  "lint":     "eslint \"packages/*/src/**/*.{ts,tsx}\"",
  "lint:fix": "eslint \"packages/*/src/**/*.{ts,tsx}\" --fix",
  "format":   "prettier --write \"packages/*/src/**/*.{ts,tsx,css,md,json}\""
  ```

## Test scenarios

| Level | Scenario |
|---|---|
| Unit | n/a |
| Integration | (a) `npm run lint` exits 0 on clean tree; (b) deliberately broken file makes it exit non-zero; (c) `npm run format` is a no-op on already-formatted file |
| E2E | n/a |

## Dependencies

- E1-S1 (workspaces must exist)

## Definition of Done

- All ACs pass
- ESLint and Prettier configs are at the root, not duplicated per workspace
- The configs are committed; transient artifacts (`.eslintcache`) are gitignored
