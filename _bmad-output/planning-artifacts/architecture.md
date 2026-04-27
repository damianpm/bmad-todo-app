---
agent: bmad-create-architecture
mode: autonomous-synthesis
sources:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/project-brief.md
note: |
  Synthesized in one pass. The interactive 12-step architecture workflow was collapsed because the
  stack and primary constraints were locked with the stakeholder before invocation; the open
  decisions are captured as ADRs below with explicit rationale.
---

# Architecture — Todo App

## 1. Overview

A two-tier application with a separate single-page frontend and a stateless HTTP API, backed by a PostgreSQL database. All three components run as containers; only the frontend talks to the browser. The api is the only thing that talks to PG.

```
┌──────────────┐  HTTPS (dev: HTTP)  ┌──────────────┐   TCP/5432    ┌────────────┐
│   Browser    │ ──────────────────▶ │   Frontend   │               │            │
│              │                     │  (Vite SPA   │  ── HTTP ───▶ │    API     │ ──▶ ┌─────────────┐
│              │ ◀────────────────── │   served by  │               │  (Fastify) │     │  PostgreSQL │
└──────────────┘                     │   nginx)     │ ◀───── JSON ──│            │ ◀── │     16      │
                                     └──────────────┘               └────────────┘     └─────────────┘
                                          ▲                              ▲                   ▲
                                          │                              │                   │
                                       :8080                          :3000                :5432
                                       (host)                       (internal)          (internal)
```

In Compose, only the **frontend** port is mapped to the host. API and DB stay on the internal network. This both reduces attack surface and forces tests / scripts to go through the documented surface.

## 2. Tech stack (locked)

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Frontend framework | React | 19.2.x | Use `useActionState` + `<form action>` for create; `useOptimistic` for toggle/delete |
| Frontend tooling | Vite | latest | TS strict mode |
| Frontend server-state | TanStack Query | v5 | List query + mutations; pairs with `useOptimistic` for crisp optimistic UI |
| Frontend styling | CSS Modules | n/a | Plain CSS modules; no Tailwind unless a future story justifies it |
| Frontend a11y testing | axe-core via Playwright | latest | Wired into E2E |
| Backend runtime | Node | 24 LTS | |
| Backend framework | Fastify | v5 | Schema-first, fast, has `inject()` for tests |
| Backend validation | Zod | v3 | Shared schemas via `packages/shared` (see § 6) |
| Backend logging | pino | latest | Structured JSON; request id middleware |
| Backend CORS | `@fastify/cors` | latest | Allowlist single origin from env |
| ORM | Drizzle ORM | latest | + `drizzle-kit` for migrations. See ADR-1 |
| Database | PostgreSQL | 16 | Single sidecar container, named volume |
| Tests (unit/integration) | Vitest | v3 | Same runner everywhere |
| Tests (API integration) | Fastify `inject()` + Testcontainers PG | latest | Real PG, ephemeral per test run |
| Tests (E2E) | Playwright | latest | Headed in dev, headless in CI |
| Container runtime | Docker | 29+ | Multi-stage builds, non-root |
| Orchestration | Docker Compose | v2 | Profiles for dev / test |
| Web server (frontend prod) | nginx (alpine) | latest | Serves built static assets |

## 3. Repository layout

Monorepo, npm workspaces. Chosen so frontend and backend can share Zod schemas and types without a publish step.

```
bmad-todo-app/
├── packages/
│   ├── shared/           # Zod schemas, TS types — shared between web and api
│   │   ├── src/
│   │   │   ├── todo.ts   # Todo schema + types
│   │   │   └── index.ts
│   │   └── package.json
│   ├── api/              # Fastify backend
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── app.ts
│   │   │   ├── routes/
│   │   │   │   ├── todos.ts
│   │   │   │   └── health.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts
│   │   │   │   ├── client.ts
│   │   │   │   └── migrations/
│   │   │   ├── plugins/
│   │   │   │   ├── error-handler.ts
│   │   │   │   └── request-id.ts
│   │   │   └── env.ts    # Zod-validated env
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   ├── drizzle.config.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/              # React frontend
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── api/
│       │   │   └── todos.ts        # fetch wrappers, parses with shared Zod
│       │   ├── components/
│       │   │   ├── TodoList.tsx
│       │   │   ├── TodoItem.tsx
│       │   │   ├── AddTodoForm.tsx
│       │   │   ├── EmptyState.tsx
│       │   │   └── ErrorState.tsx
│       │   ├── hooks/
│       │   │   └── useTodos.ts     # TanStack Query + useOptimistic
│       │   └── styles/
│       ├── tests/
│       │   ├── unit/
│       │   └── e2e/                # Playwright specs
│       ├── playwright.config.ts
│       ├── vite.config.ts
│       ├── Dockerfile
│       ├── nginx.conf
│       └── package.json
├── docker-compose.yml
├── docker-compose.test.yml
├── package.json          # workspaces root
├── tsconfig.base.json
├── .eslintrc.cjs
├── .prettierrc
├── README.md
└── docs/
    └── ai-integration-log.md
```

## 4. Domain model & ERD

Single entity, one table.

```
┌──────────────────────────────┐
│ todos                        │
├──────────────────────────────┤
│ id          UUID  PK   NN    │  ← gen_random_uuid()
│ text        TEXT       NN    │  ← length(text) BETWEEN 1 AND 500
│ completed   BOOL       NN    │  ← default false
│ created_at  TIMESTAMPTZ NN   │  ← default now()
└──────────────────────────────┘
INDEX idx_todos_created_at ON todos (created_at DESC)
```

Why this schema:
- `UUID` (not `BIGSERIAL`) so future user-scoped queries scale and so test fixtures don't fight monotonic ids.
- `created_at` indexed because the only sort order in v1 is `ORDER BY created_at DESC`.
- `completed` does **not** get its own index — too low cardinality, no filtering by status in v1.

**Forward-compat for auth (no migration today):**
- A future migration will add `user_id UUID NOT NULL REFERENCES users(id)` and a composite index `(user_id, created_at DESC)`. Today's queries don't reference `user_id`, so the migration is additive and non-breaking.

### Drizzle schema (sketch)

```ts
// packages/api/src/db/schema.ts
import { pgTable, uuid, text, boolean, timestamp, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    text: text("text").notNull(),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    textLength: check("text_length_chk", sql`length(${t.text}) BETWEEN 1 AND 500`),
    createdAtIdx: index("idx_todos_created_at").on(t.createdAt.desc()),
  }),
);
```

## 5. API contract (OpenAPI 3.1 shape)

Base URL: `/`. All requests/responses are JSON.

```yaml
openapi: 3.1.0
info:
  title: Todo API
  version: 1.0.0
paths:
  /healthz:
    get:
      summary: Liveness/readiness probe
      responses:
        "200":
          description: Service is up
          content:
            application/json:
              schema:
                type: object
                required: [status, db]
                properties:
                  status: { type: string, enum: [ok] }
                  db:     { type: string, enum: [ok, down] }
  /todos:
    get:
      summary: List todos (newest first)
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: "#/components/schemas/Todo" }
    post:
      summary: Create a todo
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [text]
              properties:
                text: { type: string, minLength: 1, maxLength: 500 }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Todo" }
        "400": { $ref: "#/components/responses/Error" }
  /todos/{id}:
    parameters:
      - in: path
        name: id
        required: true
        schema: { type: string, format: uuid }
    patch:
      summary: Update completion status
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [completed]
              properties:
                completed: { type: boolean }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Todo" }
        "400": { $ref: "#/components/responses/Error" }
        "404": { $ref: "#/components/responses/Error" }
    delete:
      summary: Delete a todo
      responses:
        "204": { description: Deleted }
        "404": { $ref: "#/components/responses/Error" }
components:
  schemas:
    Todo:
      type: object
      required: [id, text, completed, createdAt]
      properties:
        id:        { type: string, format: uuid }
        text:      { type: string, minLength: 1, maxLength: 500 }
        completed: { type: boolean }
        createdAt: { type: string, format: date-time }
    Error:
      type: object
      required: [error, message, code]
      properties:
        error:   { type: string, description: "Short machine-readable token, e.g. validation_error" }
        message: { type: string, description: "Human-readable explanation" }
        code:    { type: string, description: "Specific error code, e.g. todo.text.too_long" }
  responses:
    Error:
      description: Error response
      content:
        application/json:
          schema: { $ref: "#/components/schemas/Error" }
```

## 6. Shared types & validation

Single source of truth in `packages/shared`:

```ts
// packages/shared/src/todo.ts
import { z } from "zod";

export const TodoSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(500),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
});
export type Todo = z.infer<typeof TodoSchema>;

export const CreateTodoSchema = z.object({
  text: z.string().trim().min(1).max(500),
});
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;

export const UpdateTodoSchema = z.object({
  completed: z.boolean(),
});
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;
```

The api validates request bodies with these schemas (Fastify's Zod integration). The web client parses responses with the same `TodoSchema` so the boundary is type-checked at runtime *and* compile-time. Drift between client and server becomes impossible by construction.

## 7. Environment configuration

All processes consume env vars validated through Zod at startup. Missing/invalid → process exits with a clear error.

| Service | Var | Required | Default | Purpose |
|---|---|---|---|---|
| api | `DATABASE_URL` | yes | — | `postgres://user:pass@host:5432/db` |
| api | `PORT` | no | `3000` | HTTP listen port |
| api | `LOG_LEVEL` | no | `info` | pino level |
| api | `CORS_ORIGIN` | no | `http://localhost:8080` | Allowlisted origin |
| api | `NODE_ENV` | no | `development` | `production` in built image |
| web (build-time) | `VITE_API_BASE_URL` | yes | — | Origin or relative path the SPA hits |
| db | `POSTGRES_DB` | yes | `todos` | |
| db | `POSTGRES_USER` | yes | `todos` | |
| db | `POSTGRES_PASSWORD` | yes | — | Provided via `.env` (gitignored) |

`.env.example` checked in; `.env` gitignored. Compose reads `.env` from project root.

## 8. Error contract

**Decision:** Custom `{ error, message, code }` JSON shape, **not** RFC 7807. See ADR-3.

Behavior:
- Every 4xx / 5xx response from the api uses this shape.
- `error` is a stable token consumable by the client (e.g. `"validation_error"`, `"not_found"`, `"internal_error"`).
- `message` is human-readable, safe to surface to the user.
- `code` is the granular code, e.g. `"todo.text.too_long"`. Client can branch on it.
- 5xx errors never leak internal details into `message`; the request id is logged server-side and returned in a `x-request-id` header so support can correlate.

## 9. Frontend data flow

```
React component
  └── useTodos() hook
        ├── TanStack Query useQuery(['todos'])  ─── GET /todos
        ├── useMutation create   ─── POST /todos
        ├── useMutation toggle   ─── PATCH /todos/:id
        └── useMutation delete   ─── DELETE /todos/:id

Optimistic UI:
  - create:  React 19 useActionState pending state + Query optimistic add
  - toggle:  useOptimistic to flip the row instantly; Query rollback on error
  - delete:  useOptimistic to remove instantly; Query rollback on error
```

We use **both** TanStack Query (cache + refetch + retry) and React 19's `useOptimistic` (declarative pending UI). They compose: Query owns the canonical cache; `useOptimistic` describes the in-flight projection. ADR-2 records why.

## 10. Test strategy

The pyramid is enforced per-story:

| Level | Runner | Scope | Speed | Target volume |
|---|---|---|---|---|
| Unit | Vitest | Pure functions, validators, isolated React components, Drizzle helpers | ms | Highest |
| Integration | Vitest + Fastify `inject()` + Testcontainers PG | Each route × happy/error paths against a real PG | seconds | Medium |
| E2E | Playwright | Browser drives the running stack from `docker compose up` | tens of seconds | ≥ 5 specs |

**Coverage:** ≥ 70 % line coverage on `packages/api/src/**` and `packages/web/src/**` (excluding test files and generated migrations). Enforced in CI script.

**Required E2E specs (from FRs):**
1. Create a todo and see it appear at the top
2. Toggle a todo to completed and back
3. Delete a todo
4. Empty state on first load with no data
5. Error state when api is unreachable (mock/stub)

**Accessibility tests:** `@axe-core/playwright` runs on the main view; zero critical violations is a CI gate.

**Test data isolation:** integration tests get a fresh PG container per test file via Testcontainers. E2E uses the compose-managed PG with a known seed/cleanup script.

## 11. Container architecture (designed here, built in Step 3)

Three services in `docker-compose.yml`:

| Service | Image base | Port (host) | Healthcheck | Depends on |
|---|---|---|---|---|
| `db` | `postgres:16-alpine` | — (internal) | `pg_isready` | — |
| `api` | multi-stage Node 24 alpine | — (internal) | `wget -qO- http://localhost:3000/healthz` | `db` (condition: service_healthy) |
| `web` | multi-stage Node 24 → nginx alpine | `8080:80` | `wget -qO- http://localhost/` | `api` (condition: service_healthy) |

Volumes:
- `db_data:/var/lib/postgresql/data` — named volume so data survives `docker compose down` (lost only on `down -v`).

Networks: default user-defined bridge.

Profiles:
- (default) — full stack, prod-like build
- `dev` — mounts source, runs `vite` and `tsx watch`
- `test` — uses `docker-compose.test.yml` overlay; runs Playwright against a fresh stack

Migrations run automatically when the api starts (`drizzle-kit migrate`) so `docker compose up` is sufficient to get a working database. Idempotent.

Both app images:
- Multi-stage (deps → build → runtime).
- Run as a non-root user (`USER node` for api, `USER nginx` for web).
- Drop capabilities, read-only root filesystem where possible.
- Healthcheck declared in the Dockerfile and re-asserted in compose.

## 12. ADRs

### ADR-1: Drizzle ORM over raw `pg`

- **Decision:** Drizzle ORM + drizzle-kit migrations.
- **Alternatives considered:** raw `pg`, Knex, Prisma.
- **Why Drizzle:** Type-safe queries inferred from the schema (zero codegen runtime cost); SQL-like API so we don't fight the DB; first-class migrations via drizzle-kit. Smaller surface than Prisma; better TS than raw `pg`.
- **Why not raw `pg`:** Hand-rolled types invariably drift; no migration tooling.
- **Why not Prisma:** Heavier, requires a generate step and an extra binary in the container.
- **Trade-off accepted:** Drizzle is younger; fewer Stack Overflow answers. Mitigated by the small surface (one table).

### ADR-2: TanStack Query + React 19 `useOptimistic`

- **Decision:** Use TanStack Query for server cache + mutations and `useOptimistic` for the per-action optimistic projection.
- **Alternatives considered:** Plain `fetch` + `useState`; SWR; Redux Toolkit Query; only `useOptimistic`.
- **Why both:** Query owns the canonical cache, retry, refetch semantics. `useOptimistic` is declarative and lives next to the action — cleaner code than threading optimistic state through Query's `onMutate`/`onError`/`onSettled`.
- **Why not just `useOptimistic`:** No cache, no refetch, no retry — we'd reinvent half of Query.
- **Why not just Query optimistic mutations:** Works but scatters optimistic state across mutation callbacks. With React 19 we can do better.
- **Trade-off accepted:** Two abstractions instead of one. Mitigated by encapsulating the pattern in `useTodos`.

### ADR-3: Custom error JSON over RFC 7807 problem+json

- **Decision:** `{ error, message, code }` JSON.
- **Alternatives considered:** RFC 7807, plain string body, GraphQL-style errors array.
- **Why custom:** Smaller, codeable client-side, no `application/problem+json` content-type negotiation.
- **Why not RFC 7807:** Over-spec for a single-app, single-team, one-table API. Adds `type`/`instance` fields the client never reads.
- **Trade-off accepted:** If we ever need to interoperate with external API consumers, we may switch. The shape is small enough to map.

### ADR-4: `/healthz` shape with downstream check

- **Decision:** `GET /healthz` returns 200 with `{ status: "ok", db: "ok" | "down" }`. The api still returns 200 even if `db: "down"` (it's alive enough to serve the probe).
- **Alternatives considered:** Separate `/livez` + `/readyz` (Kubernetes-style), 503 when DB is down.
- **Why one endpoint, always 200:** Compose only needs liveness for ordering. Returning 503 when DB is down would make the api flap during startup and confuse `depends_on: service_healthy`. The `db` field is for observability dashboards, not for orchestration logic.
- **Trade-off accepted:** If we ever move to Kubernetes we'll add `/readyz` separately.

### ADR-5: Migrations run on api container start

- **Decision:** The api entrypoint runs `drizzle-kit migrate` before listening.
- **Alternatives considered:** A separate `migrator` one-shot service; manual `npm run migrate` step.
- **Why on start:** `docker compose up` is the entire deployment story for v1. A one-shot service complicates compose ordering. Manual steps violate the "single command" deliverable.
- **Mitigation for multi-instance future:** Drizzle migrations are wrapped in advisory locks so concurrent api instances don't double-apply.

### ADR-6: Monorepo with npm workspaces

- **Decision:** Single repo, three workspaces (`shared`, `api`, `web`).
- **Alternatives considered:** Two separate repos; pnpm workspaces; Nx/Turborepo.
- **Why monorepo:** Shared Zod schemas need to live in one place to keep client and server in lockstep without a publish step.
- **Why npm workspaces (not pnpm/Nx):** Already installed everywhere. The repo is small enough that pnpm's hoisting wins and Nx's caching don't pay off.
- **Trade-off accepted:** No remote build cache. Acceptable at this size.

## 13. Hand-off

Next agents (parallel):
- **PM "John" (`bmad-create-epics-and-stories`)** to flesh out epics E1–E5 and write all E1 stories in detail.
- (Step 2 onward) **Dev "Amelia" (`bmad-dev-story`)** to implement against stories.
- (Step 4) **QA workflows** for coverage / a11y / security review.
