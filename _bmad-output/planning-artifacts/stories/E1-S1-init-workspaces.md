# E1-S1 — Initialize npm workspaces and base TypeScript config

**Epic:** E1 — Project Scaffolding
**Status:** ready
**Estimated:** S

## User value

> "I need a clean monorepo skeleton so I can drop the api, web, and shared packages into it without fighting tooling."

## Context

The architecture document (§ 3) calls for a monorepo with three workspaces: `packages/shared`, `packages/api`, `packages/web`. This story creates the skeleton — empty packages, root configs — but no application code.

## Acceptance criteria

**Given** an empty repo
**When** I run `npm install` at the root
**Then** all three workspaces are linked locally with no errors
  And `node_modules` is created at the root only (hoisted)

**Given** the workspaces exist
**When** I run `npx tsc --noEmit` from any workspace
**Then** it succeeds with strict mode enabled (no implicit any, no unused locals)

**Given** the base config
**When** another workspace adds `"extends": "../../tsconfig.base.json"` to its `tsconfig.json`
**Then** it inherits strict mode, target `ES2022`, module `ESNext`, `moduleResolution: "Bundler"`, `jsx: "react-jsx"` only when needed

## Implementation notes

Files to create:

- `package.json` (root)
  ```json
  {
    "name": "bmad-todo-app",
    "private": true,
    "workspaces": ["packages/*"],
    "engines": { "node": ">=24" }
  }
  ```
- `tsconfig.base.json` with strict mode, ES2022, bundler resolution.
- `packages/shared/package.json`, `packages/api/package.json`, `packages/web/package.json` — name them `@bmad-todo/shared`, `@bmad-todo/api`, `@bmad-todo/web`. Each gets a placeholder `tsconfig.json` extending the base.
- `packages/shared/src/index.ts` — single line export so `tsc` has something to compile.

## Test scenarios

| Level | Scenario |
|---|---|
| Unit | n/a (no logic yet) |
| Integration | `npm install` succeeds; `npm run typecheck` (defined in S5) passes once added |
| E2E | n/a |

## Dependencies

- None (this is the first story)

## Definition of Done

- All ACs pass
- `npm install` is clean (no warnings about peer deps from our own packages)
- `git status` shows only the intended files; `node_modules` not staged
