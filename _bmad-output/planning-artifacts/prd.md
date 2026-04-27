---
agent: bmad-create-prd
mode: autonomous-synthesis
sources:
  - _bmad-output/source-prd.md
  - _bmad-output/planning-artifacts/project-brief.md
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
note: |
  Synthesized in one pass rather than walking the 12-step interactive workflow.
  The interactive walk would have surfaced the same content; menus were collapsed because constraints
  were already locked with the stakeholder before this skill was invoked.
---

# PRD — Todo App

## 1. Executive summary

A single-user, full-stack Todo application that does the four CRUD verbs cleanly and stops there. Users open the app, see their list, add a task, mark it done, delete it. Tasks survive refresh, restart, and container rebuild. The product ships with empty/loading/error states, responsive layout, optimistic UI, and meaningful test coverage. No accounts, no priorities, no deadlines, no notifications in v1.

This PRD locks the v1 surface area so the Architect can design without re-litigation.

## 2. Vision

> Open the app, capture a thought, check it off, move on. Refresh — still there. Open it on your phone — works.

The product's value is *what it doesn't have*. The reference experience is closer to a sticky-note pad than to a project-management tool.

## 3. User personas & journeys

### Persona — "Solo task-keeper"
A single individual on a single device (or two of their own devices), capturing personal tasks. No team, no sharing.

### Primary journeys

**J1 — First open (empty state)**
1. User opens the app. → Sees an empty-state illustration / message and a single visible input field.
2. User types a task and presses Enter (or taps "Add"). → New todo appears at the top of the list immediately (optimistic).

**J2 — Daily use (capture and complete)**
1. User opens the app. → List of existing todos renders within ~1 s.
2. User checks off a completed task. → Item visually shifts to "completed" state immediately.
3. User adds a new task. → Appears at top.
4. User closes the tab.
5. Next day, user re-opens. → Same list, same statuses.

**J3 — Cleanup**
1. User clicks/taps the delete icon on a todo. → Item is removed from the list immediately.
2. (Optional, deferred) Undo affordance — **not in v1**.

**J4 — Network failure**
1. User adds a task while the API is unreachable. → Optimistic add appears, then rolls back with an inline error toast: "Couldn't save. Try again."
2. User retries. → On success, normal flow resumes.

**J5 — Cross-device**
1. User opens the app on a phone. → Layout adapts (single column, comfortable tap targets), all journeys identical.

### Edge / negative paths
- Empty input on add → Add button disabled or submit silently rejected.
- Text > 500 chars → Submit rejected client-side with an inline message; server also rejects with 400.
- Concurrent toggle race (two tabs) → Last write wins; no merge UI in v1.

## 4. Domain model

```
Todo
├── id          : UUID (server-generated)
├── text        : string, 1–500 chars (trimmed; non-empty after trim)
├── completed   : boolean, default false
└── createdAt   : ISO 8601 timestamp (server-generated, UTC)
```

Sort order on read: `createdAt DESC` (newest first). Locked.

**Future-proofing constraint:** The schema and API must permit adding a `userId` (UUID, FK to a future `users` table) without breaking changes. In practice this means: no implicit "the user" in routing or storage, all CRUD operations should be expressible as scoped queries even though the scope is currently `*`.

## 5. Functional requirements

### FR-1 — List todos
- API: `GET /todos` returns `200` with an array of Todo objects (newest first).
- UI: Renders the list on initial load. Shows a loading skeleton/spinner while fetching. Shows the empty state when the array is `[]`. Shows an inline error with a retry button on fetch failure.

### FR-2 — Create todo
- API: `POST /todos` with `{ text: string }`, returns `201` and the created Todo.
- Validation: `text` trimmed, length 1–500 after trim. Reject `400` otherwise.
- UI: Input + submit (Enter key or button). Optimistic insert at top of list. On error, remove optimistic entry and surface inline error.

### FR-3 — Toggle completion
- API: `PATCH /todos/:id` with `{ completed: boolean }`, returns `200` and the updated Todo. `404` if id not found.
- UI: Checkbox or affordance per row. Optimistic toggle. On error, revert and surface inline error.

### FR-4 — Delete todo
- API: `DELETE /todos/:id`, returns `204`. `404` if id not found.
- UI: Delete button per row. Optimistic remove. On error, restore and surface inline error.

### FR-5 — Health endpoint
- API: `GET /healthz` returns `200` with `{ status: "ok", db: "ok" | "down" }`. Used by Docker healthcheck and Compose startup ordering.

### FR-6 — Empty / loading / error states
- Each list-view fetch path must render distinguishable UI for: loading, empty data, fetch error.
- Required for acceptance — not optional polish.

### FR-7 — Visual completion distinction
- Completed todos must be visually distinct from active ones (recommended: muted color + strikethrough). The state must be obvious at a glance, including for users with normal vision and for color-blind users (don't rely on color alone — keep the strikethrough).

### FR-8 — Responsive layout
- Single-column layout below 600 px viewport width; comfortable tap targets (≥ 44 × 44 px); same journeys functional on mobile and desktop.

**Explicit non-FRs (do not implement):**
- ❌ Edit existing todo text (deferred to v2; flagged in source PRD as not in scope)
- ❌ Reorder, drag-drop
- ❌ Bulk operations
- ❌ Filtering by status
- ❌ Search
- ❌ Undo / soft-delete

## 6. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Read latency (list todos), p95, local | < 100 ms |
| NFR-2 | Write latency (create/toggle/delete), p95, local | < 150 ms |
| NFR-3 | Time to interactive on first load (cold cache) | < 2 s on a mid-range laptop, dev mode |
| NFR-4 | Test coverage (line) | ≥ 70 % backend, ≥ 70 % frontend |
| NFR-5 | E2E happy-path tests | ≥ 5 (create, complete, delete, empty, error) |
| NFR-6 | Accessibility | Zero critical axe-core violations; WCAG 2.1 AA |
| NFR-7 | Durability | Data survives refresh, server restart, container restart, container rebuild (named volume on PG) |
| NFR-8 | Deployment | `docker compose up` starts a working app; no manual migration step required (migrations run on api container start) |
| NFR-9 | Observability | Structured logs (pino) with request id; error responses include a code identifier |
| NFR-10 | Error contract | All 4xx/5xx errors return JSON shape `{ error: string, message: string, code: string }` (Architect to confirm or replace with RFC 7807) |
| NFR-11 | Security baseline | No XSS surface (React escapes by default); CORS restricted to configured origin; no credentials, secrets, or auth in v1 |
| NFR-12 | Future auth | Adding `userId` scoping must be a non-breaking schema migration plus middleware insertion |

## 7. Scope summary

**In scope (v1):** FR-1 through FR-8, NFR-1 through NFR-12, and the deliverables in section 8.

**Out of scope (v1):** auth, multi-user, sharing, priorities, due dates, reminders, notifications, tags, projects, search, edit-text, reorder, undo, offline mode, real-time sync, export/import, i18n.

## 8. Deliverables

1. Working application — frontend + backend + PostgreSQL, runnable via `docker compose up`.
2. Test suites — Vitest unit + integration (with Testcontainers PG), Playwright E2E.
3. Container artifacts — `Dockerfile` per service (multi-stage, non-root user, healthchecks), `docker-compose.yml`.
4. QA reports — coverage, axe-core a11y, security review notes (covered in Step 4 of the assignment).
5. AI integration log — `docs/ai-integration-log.md`.
6. README with setup instructions (final task in Step 4).

## 9. Acceptance-criteria framework (template for stories)

Each story will use Gherkin-shaped ACs:

```
Given <precondition>
When <user/system action>
Then <observable outcome>
```

Each story must include test scenarios at three levels:
- **Unit** — pure logic / single component, run in milliseconds
- **Integration** — API + real PG via Testcontainers, run in seconds
- **E2E** — Playwright against the running stack, run in tens of seconds

Definition of Done (per story):
- All AC scenarios pass at all three test levels
- Coverage thresholds maintained
- No new axe-core critical violations
- Code reviewed (or AI-reviewed via `bmad-code-review`)
- Story-level docs / log entries appended

## 10. Epic outline (handoff to SM)

| Epic | Title | Purpose | Builds |
|---|---|---|---|
| E1 | Project scaffolding | Repo layout, tsconfig, lint/format, test runners wired | Foundation |
| E2 | Backend API | PG schema + migrations, Fastify app, CRUD endpoints, validation, error handler, /healthz | FR-1..FR-5, NFR-1/2/9/10 |
| E3 | Frontend UI | List, add, toggle, delete; empty/loading/error states; responsive layout | FR-1..FR-4, FR-6..FR-8, NFR-3/6 |
| E4 | Containerization | Dockerfiles, compose, healthchecks, dev/test profiles, named PG volume | NFR-7/8 |
| E5 | QA & hardening | Coverage, a11y, perf, security review, AI integration log finalization | NFR-4..6, NFR-11 |

## 11. Open questions / decisions for Architect

- **Edit-todo-text:** confirmed out of v1 (above) but document a clean migration path (e.g., reserve `PUT /todos/:id`).
- **ORM:** stakeholder pre-suggested Drizzle; Architect to confirm via ADR (Drizzle vs. raw `pg`).
- **Error format:** simple `{error, message, code}` (this PRD) vs. RFC 7807 problem+json — Architect chooses with rationale.
- **Sort order:** locked to `createdAt DESC` here; revisit only with stakeholder approval.
- **Monorepo vs. two-package layout:** Architect's call, with rationale.
- **Optimistic UI mechanism:** stakeholder pre-suggested React 19 `useOptimistic`; Architect to confirm vs. TanStack Query optimistic mutations.

## 12. Hand-off

Next agent: **Architect "Winston" (`bmad-create-architecture`)**. Inputs: this PRD + project-brief.md. Outputs: `_bmad-output/planning-artifacts/architecture.md` with diagrams, ERD, OpenAPI-shaped API contract, env-var schema, ADRs, and a test strategy section.
