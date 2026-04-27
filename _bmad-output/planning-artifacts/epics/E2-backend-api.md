# Epic E2 — Backend API

**Goal:** Implement the Fastify backend with PostgreSQL persistence, full CRUD on `todos`, validation, error handling, structured logs, and the `/healthz` probe.

**Outcome:** `npm run dev` in `packages/api` (with PG running) yields a working API that satisfies FR-1 through FR-5 and NFR-1, NFR-2, NFR-9, NFR-10 from the PRD.

## Acceptance criteria (epic-level)

- Database schema matches architecture § 4 (single `todos` table, UUID primary key, check constraint on text length, descending index on `created_at`)
- Drizzle migrations applied automatically on api startup
- All four endpoints implemented and matching the OpenAPI contract in architecture § 5: `GET /todos`, `POST /todos`, `PATCH /todos/:id`, `DELETE /todos/:id`
- `GET /healthz` returns the documented shape and tracks DB reachability
- All error responses use the `{ error, message, code }` shape (architecture § 8)
- Request id middleware generates a UUID per request, logs it, and surfaces it via `x-request-id`
- Zod schemas from `packages/shared` validate request bodies; invalid bodies return 400 with `validation_error`
- 404 on unknown todo id for PATCH and DELETE; idempotent
- Integration tests using Fastify `inject()` + Testcontainers PG cover all happy and error paths
- Coverage ≥ 70 % line on `packages/api/src/**`

## Out of scope for E2

- Frontend (E3)
- Authentication, multi-user (architecturally allowed, deferred)

## Stories

To be drafted just-in-time during Step 2 by the SM agent (`bmad-create-story`). Likely shape:

- E2-S1 — DB schema + migrations + Drizzle client
- E2-S2 — Fastify app, env validation, logger, error plugin, request id
- E2-S3 — `GET /todos` + `POST /todos`
- E2-S4 — `PATCH /todos/:id` + `DELETE /todos/:id`
- E2-S5 — `GET /healthz` with DB probe
