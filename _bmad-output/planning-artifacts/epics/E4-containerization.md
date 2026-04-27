# Epic E4 — Containerization

**Goal:** Package frontend, backend, and database as Docker containers orchestrated by Compose; `docker compose up` yields a working, persistent app with healthchecks.

**Outcome:** Satisfies NFR-7 and NFR-8.

## Acceptance criteria (epic-level)

- Multi-stage Dockerfile per service (web, api), each running as a non-root user
- `db` service uses `postgres:16-alpine` with a named volume `db_data` mounted at `/var/lib/postgresql/data`
- Healthchecks declared per service and re-asserted in `docker-compose.yml`:
  - `db` → `pg_isready -U $POSTGRES_USER`
  - `api` → `wget -qO- http://localhost:3000/healthz` returns 200
  - `web` → `wget -qO- http://localhost/` returns 200
- Compose dependency ordering uses `depends_on: { condition: service_healthy }`
- Only `web` is exposed to the host (`8080:80`)
- DB credentials read from a gitignored `.env`; `.env.example` checked in
- Migrations run automatically on `api` startup (not a separate manual step)
- A `dev` Compose profile mounts source for hot reload (Vite + tsx watch)
- A `test` overlay (`docker-compose.test.yml`) runs Playwright against a fresh stack and exits non-zero on failure
- Data persists across `docker compose down` followed by `docker compose up` (verified in an E2E "data persistence" test)
- `docker compose logs` shows structured pino JSON for the api

## Out of scope for E4

- Kubernetes manifests
- TLS / reverse proxy in front of nginx
- Multi-arch image builds (focus on host arch only)

## Stories

Drafted just-in-time. Likely shape:

- E4-S1 — `packages/api/Dockerfile`
- E4-S2 — `packages/web/Dockerfile` (+ nginx config)
- E4-S3 — `docker-compose.yml` + `.env.example`
- E4-S4 — Dev profile with hot reload
- E4-S5 — Test overlay + Playwright runner container
- E4-S6 — Persistence E2E test (down → up → data still there)
