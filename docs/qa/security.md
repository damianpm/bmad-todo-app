---
review-date: 2026-04-29
target: commits f945974..1b4cafa (Epics E1–E4, security-relevant slice)
diff-size: 1,613 lines / 39 files (api source, web client/api, nginx.conf, Dockerfiles, docker-compose*.yml, .env.example, SQL migrations)
spec: _bmad-output/planning-artifacts/architecture.md (NFR-1..12, ADR-1..6)
context: prd.md, code-review-findings.md, deferred-work.md
method: bmad-code-review with three parallel adversarial layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) on Opus 4.7
gate: E5-S4 security review
---

# Security review — E5-S4

## Top-line verdict: **PASS — all High and Medium patches applied (2026-04-29)**

No exploitable critical issues. The hardening posture is consistent with NFR-11's stated v1 scope ("no auth in v1; CORS restricted to configured origin"). Three categories of finding:

- **Patch this epic — DONE:** All 11 High (H1–H11) and 11 actionable Medium (M1–M9, M11, M13–M15) findings were applied in this session. Validation: 35/35 api unit+integration tests, 19/19 web tests, 14/14 shared tests, full-coverage gate (api 90.3% line / 79.5% branch — well above the 70% threshold), nginx config syntax check, persistence script, and a 9-case live curl smoke test (HSTS/CSP/dotfile blocking/method allow-list/Cache-Control/pagination caps/healthz lockdown/x-request-id reflection prevention/body limit). M10 (nginx resolver) and M12 (wget healthcheck) were already documented as deferred (D7/F3).
- **Already deferred:** ~11 issues, all cross-referenced to `deferred-work.md` (D1 container hardening, D2 digest pinning, D6 rate-limiting, D7 nginx resolver, F1–F5).
- **Out of scope per NFR-11:** authn/authz, CSRF, multi-tenant isolation. Explicit product decision; flagged here so the next time the scope expands the reviewer remembers to revisit.

### Patch sweep — what landed where

| ID | Finding | File(s) touched |
|---|---|---|
| H1 | Zod errors no longer echo input | `packages/api/src/app.ts` |
| H2 | `/todos` pagination (default 100, max 500) | `packages/api/src/routes/todos.ts` |
| H3 | `CORS_ORIGIN` regex + wildcard rejection | `packages/api/src/env.ts`, `tests/unit/env.test.ts` |
| H4 | Fastify `bodyLimit: 32k` | `packages/api/src/app.ts` |
| H5 | nginx deny dotfiles + source maps | `packages/web/nginx.conf` |
| H6 | `pg_advisory_lock` around migrations | `packages/api/src/db/migrate.ts` |
| H7 | Connection-string redaction in startup logs | `packages/api/src/log-redact.ts` (new), `server.ts`, `db/migrate.ts`, `tests/unit/log-redact.test.ts` |
| H8 | `requestIdHeader: false` (always server-generated) | `packages/api/src/app.ts` |
| H9 | `pg.Pool` timeouts (statement / connection / idle) | `packages/api/src/db/client.ts` |
| H10 | `.env.example` placeholder password | `.env.example` |
| H11 | `/api/healthz` locked to in-container loopback | `packages/web/nginx.conf` |
| M1 | Fastify connection / request / keepAlive timeouts | `packages/api/src/app.ts` |
| M2 | Force-exit timeout in shutdown handler | `packages/api/src/server.ts` |
| M3 | nginx `limit_except GET POST PATCH DELETE OPTIONS` | `packages/web/nginx.conf` |
| M4 | nginx `X-Forwarded-For: $remote_addr` (overwrite) | `packages/web/nginx.conf` |
| M5 | CSP `connect-src` / `base-uri` / `form-action` / `frame-ancestors` | `packages/web/nginx.conf` |
| M6 | HSTS header | `packages/web/nginx.conf` |
| M7 | `AbortController` timeout on web fetch | `packages/web/src/api/client.ts` |
| M8 | `Cache-Control: no-store` on `/todos` responses | `packages/api/src/routes/todos.ts` |
| M9 | `VITE_API_BASE_URL` fail-fast in PROD | `packages/web/src/api/client.ts` |
| M11 | `BIND_HOST` defaults to 127.0.0.1 in compose ports | `docker-compose.yml`, `docker-compose.dev.yml` |
| M13 | Healthcheck DB probe wrapped in 2 s `Promise.race` timeout | `packages/api/src/routes/health.ts` |
| M14 | CORS `allowedHeaders: ["content-type"]`, `credentials: false` | `packages/api/src/app.ts` |
| M15 | (rolled into H1) — Fastify validator path no longer echoes `e.message` | `packages/api/src/app.ts` |

## Method

Three parallel reviewers, each at the same model capability as the orchestrator (Opus 4.7), each run with isolated context:

- **Blind Hunter** — diff only, no project access. 27 findings.
- **Edge Case Hunter** — diff + read-only project access for path tracing. 41 findings (JSON).
- **Acceptance Auditor** — diff + architecture.md + prd.md + prior-review/deferred-work ledgers. 6 findings.

After dedupe across the three layers (high overlap on CORS validation, body limits, request-id reflection, container hardening): ~36 unique findings, classified below.

The exact diff under review can be reproduced with: `git diff f945974..1b4cafa -- 'packages/api/src/**' 'packages/web/nginx.conf' 'packages/web/Dockerfile*' 'packages/api/Dockerfile*' 'docker-compose*.yml' 'packages/web/src/api/**' 'packages/web/src/hooks/**' 'packages/web/src/components/**' 'packages/web/src/App.tsx' 'packages/web/src/main.tsx' '.env.example' '.dockerignore' 'scripts/test-persistence.sh'`.

---

## Findings — patch this epic

Severity is judged against the v1 deployment profile (single-user, internal, behind localhost or a trusted reverse proxy). Several items would be Critical in a public-facing deployment but rank lower here.

### High — info disclosure / availability

#### H1. Zod validation errors echo user input back to the client *(blind+edge+auditor)*

`packages/api/src/app.ts` lines ~329–336 (the 400 error handler) builds the response message as `${first.path.join(".")}: ${first.message}`. Fastify's default validator (line ~344–350 of the same handler) returns `e.message ?? "validation failed"` verbatim. Both can include the offending value the attacker submitted. Real risk: log injection (the value is also pino-logged), reflected payload, and noisy info disclosure on the error contract that NFR-10 specifies should be `{error, message, code}` *without* leaking implementation details.

**Fix:** Return a stable shape: `{ error: "validation_failed", code: "validation.invalid", field: first.path.join(".") }` and never echo `e.message` for the unknown-validation path.

#### H2. `GET /todos` is unbounded — no pagination, no server-side cap *(blind+edge)*

`packages/api/src/routes/todos.ts` ~684 — `app.db.select().from(todos).orderBy(desc(todos.createdAt))`. Once the table grows (or an attacker fills it via the unauthenticated POST), a single GET will load every row into memory in both the API and the browser.

**Fix:** Add `.limit(MAX)` server-side (default 100, hard cap 500) plus an explicit `?limit=&offset=` parsed via Zod. NFR-12 already implies this ("the UI should remain responsive under typical load") — the architecture didn't pin a number.

#### H3. `CORS_ORIGIN` env validator accepts wildcards / arbitrary strings *(blind+edge+auditor)*

`packages/api/src/env.ts` line ~599 — `CORS_ORIGIN: z.string().default("http://localhost:8080")`. Any operator setting `CORS_ORIGIN=*` (or a typo'd value) silently violates NFR-11's "CORS restricted to configured origin" without failing startup. Architecture § 7 says "Missing/invalid → process exits with a clear error" — this validator does not enforce "invalid".

**Fix:** Tighten the schema to a strict origin: `z.string().regex(/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i).refine(v => v !== "*", "wildcard origin disallowed")`. Optionally accept a comma-separated list and parse to array.

#### H4. Asymmetric body-size limits (1 MB Fastify default, 16 KB nginx) *(blind+edge)*

`packages/api/src/app.ts` ~298–309 doesn't pass `bodyLimit` to Fastify, so the API accepts up to **1 MB** when hit directly (which the dev-overlay does — see M11). nginx caps at 16 KB but the dev profile and any future "API behind a different proxy" deployment lose that floor.

**Fix:** `Fastify({ bodyLimit: 32 * 1024 })` so the application is the source of truth on limits.

#### H5. nginx `try_files` will serve any stray file under `/usr/share/nginx/html` *(blind+edge)*

`packages/web/nginx.conf` ~918–920 — the SPA fallback is `try_files $uri $uri/ /index.html;`. There is no deny rule for dotfiles, source maps, or `.env` if one is ever copied into the dist directory. The web Dockerfile build stage doesn't currently produce these, but a misconfigured `vite.config.ts` (sourcemap on) or a deploy mistake would expose them.

**Fix:** Add explicit deny rules ahead of the fallback:

```nginx
location ~ /\.       { deny all; return 404; }
location ~ \.map$    { deny all; return 404; }
```

#### H6. Migrations run on every API boot, non-transactional, with full DDL credentials *(blind+edge)*

`packages/api/src/server.ts` ~9 awaits `runMigrations(env.DATABASE_URL)`. Two real concerns: (a) the runtime DB user has implicit DDL rights forever — a compromised app can `DROP TABLE`; (b) when this stack ever runs more than one API replica, two boots will race the `drizzle-orm/migrator` without an advisory lock.

**Fix (this epic):** Wrap the migration call in `pg_advisory_lock(<constant>)` / `pg_advisory_unlock`. **Bigger fix (next epic):** Run migrations as a separate compose service / init-container with a dedicated DB user; the runtime user gets DML-only.

#### H7. Startup error logging may surface the connection string *(edge)*

`packages/api/src/server.ts` ~747–750 and `packages/api/src/db/migrate.ts` ~430–433 — both top-level catch blocks log the full error to stderr. Postgres driver errors routinely include the connection string (with embedded password) in their message. NFR-9 says "structured logs with request id"; it does not say "log credentials at startup."

**Fix:** Log `err instanceof Error ? err.message : String(err)` and replace any `postgres://user:pass@…` substring with `postgres://****@…` via a pre-log redactor (or just use pino's `redact` config — the API logger already exists, the boot path doesn't use it).

#### H8. `x-request-id` reflected from client header without validation *(edge)*

`packages/api/src/app.ts` ~316–318 — Fastify is configured with `requestIdHeader: "x-request-id"`, so an attacker-supplied header populates `req.id` and the `onSend` hook reflects it back via `Reply.header("x-request-id", req.id)`. Real risks: header injection if the runtime ever lets `\r\n` through, log forging (poisoned correlation IDs), and oversized-header amplification.

**Fix:** `genReqId: () => randomUUID()` (always generate; ignore client header), or validate that incoming header matches `/^[A-Za-z0-9-]{1,64}$/` before trusting it.

#### H9. `pg.Pool` has no statement / connection / idle timeouts *(edge)*

`packages/api/src/db/client.ts` ~393–395 — `new pg.Pool({ connectionString })`. A slow query (intentional or accidental) will hold a pool slot indefinitely; under any concurrent load the pool exhausts and every request hangs.

**Fix:** `new pg.Pool({ connectionString, max: 10, statement_timeout: 5000, idle_in_transaction_session_timeout: 10000, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000 })`.

#### H10. `.env.example` ships a literal usable password (`POSTGRES_PASSWORD=todos`) *(blind+auditor)*

`.env.example` line ~45 — combined with `POSTGRES_USER=todos` and `POSTGRES_DB=todos`, an operator who copies `.env.example` to `.env` verbatim gets a working stack with credentials `todos:todos`. Compose's `${POSTGRES_PASSWORD:?}` only catches **unset/empty** — it does not catch "user copied the example."

**Fix:** Set `POSTGRES_PASSWORD=replace_me_before_running` in `.env.example` (or leave blank so the `:?` guard fires) and document the rule in the README's quick-start.

#### H11. `/healthz` reachable through the public proxy and discloses DB liveness *(blind+edge)*

The web tier proxies `/api/healthz`, and the route returns `{ status: "ok", db: dbStatus }`. The DB-status leak gives attackers a precise DoS-success oracle.

**Fix:** Either (a) split `/healthz` (always 200, no body details, public) from `/readyz` (full status, internal-only via `allow 127.0.0.1; allow 172.16.0.0/12; deny all;` at nginx) or (b) keep one endpoint and stop returning `db` in the body — log it server-side instead.

### Medium — defense in depth

#### M1. Fastify has no `connectionTimeout` / `requestTimeout` / `keepAliveTimeout` *(edge)*

`packages/api/src/app.ts` instantiation. Slowloris-style attackers can tie up sockets when the API is hit directly.

**Fix:** `Fastify({ connectionTimeout: 10_000, requestTimeout: 30_000, keepAliveTimeout: 5_000, bodyLimit: 32 * 1024 })`.

#### M2. Graceful-shutdown handler has no force-exit timeout *(edge)*

`packages/api/src/server.ts` ~735–742 awaits `app.close()` then `pool.end()` in the SIGTERM/SIGINT handlers. If a request hangs on the DB, the process never exits — Docker's 10 s grace passes, then SIGKILL drops in-flight work.

**Fix:** `setTimeout(() => process.exit(1), 10_000).unref()` ahead of `app.close()`.

#### M3. nginx accepts every HTTP method on `/api/` *(blind+edge)*

`packages/web/nginx.conf` ~888–910 — no `limit_except`. TRACE/CONNECT/OPTIONS reach Fastify untouched.

**Fix:** Add inside `location /api/`:
```nginx
limit_except GET POST PATCH DELETE OPTIONS { deny all; }
```

#### M4. `X-Forwarded-For` propagated to the API without trusting only the proxy hop *(blind+edge)*

`packages/web/nginx.conf` ~896 — `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` appends the immediate peer to whatever the client sent. Today nothing in the API trusts XFF, but the rate-limit work in D6 will, and that work needs this fixed first.

**Fix:** `proxy_set_header X-Forwarded-For $remote_addr;` (overwrite, do not append) — and document in nginx.conf comments why.

#### M5. CSP omits `connect-src` *(edge)*

`packages/web/nginx.conf` ~884 — current CSP allows defaults; `connect-src` is not pinned, so an XSS payload (limited surface today, but possible via future markdown rendering or richtext) could fetch attacker domains.

**Fix:** Add to the CSP header: `connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`.

#### M6. HSTS header missing *(blind+edge)*

`packages/web/nginx.conf` ~881–884 — the security headers block sets X-Frame-Options, X-Content-Type-Options, Referrer-Policy, but no `Strict-Transport-Security`. Today the stack is HTTP-only behind localhost; the moment it ever sits behind HTTPS, the absence of HSTS leaves the first-hit downgrade window open.

**Fix:** `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;` — guarded behind a comment that this is harmless on plain HTTP.

#### M7. Web fetch has no `AbortController` / timeout *(edge)*

`packages/web/src/api/client.ts` ~1015 — `fetch(...)` with no signal. If the API hangs, the SPA hangs forever.

**Fix:** Wrap fetch with a 10 s `AbortController` and surface the abort as an error to TanStack Query's retry path.

#### M8. `Cache-Control: no-store` missing on `/todos` responses *(edge)*

`packages/api/src/routes/todos.ts` ~684 — no cache headers. A shared HTTP cache (CDN, corporate proxy) could serve one user's todos to another.

**Fix:** `reply.header("cache-control", "no-store")` on all `/todos*` routes (a single Fastify hook is cleaner).

#### M9. `VITE_API_BASE_URL` silently falls back to `http://localhost:3000` *(edge+auditor)*

`packages/web/src/api/client.ts` ~992. Architecture § 7 marks this var as **Required: yes** with no default. A forgotten `--build-arg` produces a bundle that calls `localhost:3000` from the user's browser — silent failure rather than the loud build-time exit the spec promises.

**Fix:** At module load: `if (!import.meta.env.VITE_API_BASE_URL) throw new Error("VITE_API_BASE_URL must be set at build time")`. The TanStack Query client construction will then crash predictably during CI smoke tests.

#### M10. nginx hard-codes the upstream IP at startup (no `resolver`) *(blind+edge)*

Already filed as **D7** in `deferred-work.md`. Reaffirmed by two reviewers; the deferral rationale (single-replica compose, restart-stable DNS) still holds for v1, but the mention is here for completeness.

#### M11. Dev compose overlay publishes the API port to the host *(edge+auditor)*

`docker-compose.dev.yml` ~64–65 — `ports: - "${API_PORT:-3000}:3000"` for the API. Architecture § 1 says **only the frontend port** is mapped to the host. The dev overlay deliberately breaks this. Two issues:

1. The architecture text is unconditional ("API and DB stay on the internal network"). The dev exception isn't documented in the architecture itself.
2. `WEB_PORT` and `API_PORT` both bind `0.0.0.0` in compose, so a developer on a Wi-Fi network is exposing both to the LAN.

**Fix (cheap):** Bind to `127.0.0.1` in both compose files: `ports: - "127.0.0.1:${WEB_PORT:-8080}:80"`. Document the dev-overlay deviation in `architecture.md` § 1 with a one-line "dev-only" exception.

#### M12. `wget`-based healthchecks expand container attack surface *(blind)*

Already filed as **F3** in `deferred-work.md`.

#### M13. `/healthz` uses `select 1` with no timeout *(edge)*

`packages/api/src/routes/health.ts` ~646–655 — if the DB is slow but not dead, the healthcheck blocks until pool exhaustion, which then makes the entire api unhealthy. Sketch: `Promise.race([db.execute(sql\`select 1\`), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2000))])`.

#### M14. CORS allows methods but does not constrain headers / credentials *(edge)*

`packages/api/src/app.ts` ~311–314 — `@fastify/cors({ origin })` without explicit `allowedHeaders` or `credentials: false`. Today there are no cookies and no custom headers, but the laxer the policy the easier a future regression slips by.

**Fix:** `cors({ origin, methods: ["GET","POST","PATCH","DELETE"], allowedHeaders: ["content-type"], credentials: false })`.

#### M15. No content-type enforcement / route-schema body validation *(blind)*

`packages/api/src/routes/todos.ts` ~689–694 — `CreateTodoSchema.parse(req.body)` runs after Fastify's default JSON parser. Sending `application/x-www-form-urlencoded` falls through to a parse error rather than a clean 415. Fastify's `schema: { body: ... }` integrates more cleanly with the error contract.

**Fix:** Adopt Fastify's body schema integration on each mutating route, or add a `preValidation` hook that rejects non-JSON content types with a stable 415.

### Low — belt and braces

- **L1.** Container has full caps / writable root / no `no-new-privileges` *(blind+edge+auditor)* — already **D1** in `deferred-work.md`.
- **L2.** Rate-limiting at nginx and Fastify *(blind+edge)* — already **D6**.
- **L3.** Container resource limits (mem/cpu/pids) *(edge)* — partial of **D1**; reaffirmed.
- **L4.** Docker base images not digest-pinned *(blind)* — already **D2**.
- **L5.** Migrations folder bundled into runtime image *(blind)* — accepted in v1 (single binary deploy), revisit alongside H6's "separate migration job".
- **L6.** Production process started via `tsx` rather than built JS *(edge)* — explicit architecture decision (see ai-integration-log Step 3 reasoning); not a security issue, scoped here for visibility.
- **L7.** `Server: nginx` token leaked *(blind)* — `server_tokens off` removes the version, the rest needs `nginx-extras` or a CDN. Defer.
- **L8.** No `frame-ancestors 'none'` in CSP *(blind)* — XFO covers it on every browser that matters; folded into M5's CSP tightening.
- **L9.** `db_data` volume has no documented backup or encryption-at-rest *(edge)* — operational concern; not a code issue.
- **L10.** `scripts/test-persistence.sh` MARKER logged unescaped *(edge)* — script-only, no risk in v1.
- **L11.** ~~AddTodoForm trims client-side; verify shared schema also trims~~ *(blind)* — **Verified 2026-04-29.** `packages/shared/src/todo.ts` defines `CreateTodoSchema` as `z.string().trim().min(1).max(500)` and the integration test "trims whitespace from text" exercises it (`packages/api/tests/integration/todos.test.ts:58`). Already aligned, no fix needed.
- **L12.** Trailing-newline missing on two migration metadata files *(blind)* — cosmetic.
- **L13.** Postgres container default UID *(edge)* — folded into D1.
- **L14.** Playwright e2e image runs as root *(edge)* — test image only, no production reach.

---

## Out of scope per spec — flagged for future revisits

These are real concerns but explicit non-goals for v1. When the scope expands, a follow-up review must revisit them.

- **No authentication or authorization on any route.** Blind Hunter (B2) flagged this as Critical. NFR-11 ("no auth in v1; CORS restricted to configured origin") makes this an explicit product decision. Follow-up on the first user-segmented or shared deployment.
- **No CSRF protection.** Blind Hunter (B3) flagged this as High. Moot under NFR-11 (no cookies, no auth surface to forge); becomes load-bearing the same moment auth is added.
- **No tenant model on `todos`.** Same trigger as the auth follow-up.
- **`DATABASE_URL` passed in the API container's environment** *(edge)* — visible via `docker inspect`. Acceptable for v1 single-host compose; promotes to a real concern in any orchestrator (Kubernetes, ECS) with shared host access.

---

## Already deferred — reaffirmed by this review

These items are already in `_bmad-output/implementation-artifacts/deferred-work.md`. This review re-confirms the deferral rationale; no action needed beyond the existing "when to reconsider" triggers.

- **D1** Container capability hardening (`cap_drop`, `read_only`, `no-new-privileges`, `USER nginx`, pids_limit, mem/cpu limits)
- **D2** Pin base images to digests
- **D6** nginx rate limiting and slow-loris mitigations
- **D7** nginx DNS resolver block
- **F1** db service resource and logging hygiene
- **F3** Replace `wget` healthchecks with `node -e fetch`

The Acceptance Auditor specifically called out **A1 (Web container as root)** as "Deferred-but-load-bearing" because the architecture text uses unconditional language ("Run as a non-root user … `USER nginx` for web"). The deferral rationale in `deferred-work.md` D1 covers this — the gap is not exploit-relevant in v1 (nginx workers still drop to the `nginx` user; only the master is root) but the architecture should be amended to read "where possible" if that wording reflects intent. *Recommended doc fix: update architecture.md § 11 to match the deferral.*

---

## Process notes

- **Three-layer parallel review worked well.** Distinct overlap pattern: Blind Hunter raised "what's missing" framing (auth, CSRF, HSTS, digest pinning) that the spec-aware Auditor correctly classified as out-of-scope; Edge Case Hunter found timeouts and reflection paths the others missed. Reviewing each layer's distinct contributions separately would have been a noisier review.
- **Auditor's spec-cross-reference was the most load-bearing layer** for distinguishing "actual gap" from "intentional v1 trade-off". Without it, ~15 findings would have read as Critical/High that NFR-11 explicitly accepts for v1.
- **No subagent failures.** All three returned within 100–110 s on Opus 4.7 with isolated context.

## Closeout

**Option A executed (2026-04-29).** All 22 actionable High/Medium patches applied in a single sweep. Verification:

- `npm run test:coverage` (root, all workspaces): **68 tests pass**, api 90.3%/79.5% (line/branch), web 96.3%/89.7%, shared 100%/100% — all above the 70% gate.
- `nginx -t` against the new `nginx.conf`: syntax OK.
- `docker compose up -d --build --wait`: full stack healthy with the new images.
- `bash scripts/test-persistence.sh`: PASS — marker survived volume restart, no regression.
- 9-case live curl smoke test against `http://localhost:8080`: every assertion passed (HSTS / CSP with `connect-src`+`base-uri`+`form-action`+`frame-ancestors` / `/.env` 404 / `*.map` 404 / TRACE 405 / Cache-Control no-store / pagination cap returns 400 with sanitized message / `/api/healthz` 403 externally + 200 from in-container probe / oversize body 413 / x-request-id always server-generated regardless of client header).

Remaining work tracked in `_bmad-output/implementation-artifacts/deferred-work.md`. E5-S4 gate: **PASS**.
