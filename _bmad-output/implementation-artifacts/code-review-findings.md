---
generated: 2026-04-29
reviewer: bmad-code-review (Blind Hunter + Edge Case Hunter + Acceptance Auditor)
diff_range: 58e54ed..HEAD (E4 containerization + README + AI log)
spec: _bmad-output/planning-artifacts/epics/E4-containerization.md
---

# Code review findings — E4 + docs

44 findings after dedup. **9 decision-needed (resolved 2026-04-29), 19 patch, 13 defer, 10 dismissed.**

---

## decision-needed (D) — resolved 2026-04-29

Each decision below records the chosen direction **and why**. Items marked `→ defer` were promoted to `deferred-work.md` as future TODOs.

- [x] **D1 — Container capability hardening (caps / read-only / tmpfs / pids_limit) → defer**
  *Why:* Architecture § 11 phrased this as "where possible" and v1 is a single-user demo not shipping to a shared host. The hardening pass (cap_drop, read_only, tmpfs for nginx/cache and api/tmp, security_opt: no-new-privileges, pids_limit) is real value when this stack runs anywhere multi-tenant — but each setting needs verification that the workload still functions, and that's pure overhead now.
  *Knock-on:* P1 (web `USER nginx`) is part of the same hardening pass and is also deferred — applying USER nginx without the rest gives a half-finished posture.

- [x] **D2 — Pin base images by digest → defer**
  *Why:* Reproducible CI builds and supply-chain hardening matter when more than one person operates the stack. With one developer and floating tags pulling fresh-but-trusted upstream images on every build, the cost (need a Renovate-style update flow to refresh digests) outweighs the benefit. Re-evaluate when the project has CI.

- [x] **D3 — Run via `tsx` in prod (do NOT compile to `dist/`) → keep current approach**
  *Why:* The chosen approach is recorded in `docs/ai-integration-log.md` § Step 3 / E4-S1 with explicit rationale: shared package's `main` points at `src/index.ts`, so a compile path needs shared compiled or bundled too. Running with `tsx` keeps the runtime story uniform with dev (`tsx watch`) and avoids a bundler decision the architecture didn't take. The architecture's "deps → build → runtime" line is honored in spirit — there is a build phase (`npm ci`), just not a `tsc` emit phase.
  *Trade-off accepted:* production image ships TS source + the tsx runner. Slightly larger attack surface; acceptable for v1.

- [x] **D4 — Persistence verification stays as `scripts/test-persistence.sh` → keep, update AC text**
  *Why:* Driving `docker compose down` + `compose up` from inside a Playwright spec is awkward — it requires a setup hook that shells out, then re-establishes browser context against a recreated stack. A bash script with `set -euo pipefail` is the right tool for a process-level lifecycle test. The E4 epic's AC text ("E2E 'data persistence' test") will be updated to read "scripted persistence test" to match reality.

- [x] **D5 — Dev mode as overlay file (NOT Compose profile) → keep, update AC text**
  *Why:* Compose `profiles:` cannot override `build`, `command`, or `volumes` on a service that already exists in the base file — they only opt services in/out. Hot reload requires *replacing* the build (Dockerfile.dev), command (`tsx watch` / `vite`), and adding bind-mount volumes. That's exactly what overlays are for. The E4 epic AC text will be updated.

- [x] **D6 — No rate limiting / slow-loris guards → defer**
  *Why:* Single-user demo, no public exposure expected. The nginx defaults are not catastrophic for this profile. Adds value the moment this is deployed somewhere reachable from the internet.

- [x] **D7 — No nginx DNS resolver block → defer**
  *Why:* With `restart: unless-stopped` and Compose's stable internal DNS, the api container's IP doesn't change in normal operation. The resolver block adds machinery for a failure mode (api recreation getting a new IP while nginx caches the old one) that is rare in this deployment. Re-evaluate when the api scales horizontally or when blue/green deploys are introduced.

- [x] **D8 — Add CSP header → ACCEPTED, folded into P4**
  *Why:* Absence is the wrong default. Tightening later is cheap; loosening later requires audit. Initial value: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'` (Vite emits inline styles, so `'unsafe-inline'` for styles is required for the bundle to render). No script-src directive falls through to default-src 'self', which is what we want.

- [x] **D9 — `/healthz` semantics unchanged → dismiss**
  *Why:* Verified at `packages/api/src/server.ts:9`: `runMigrations()` is awaited before `app.listen()`. The api process does not accept connections until migrations complete. The Edge Case Hunter's TOCTOU concern (E10) does not apply to current code. ADR-4's choice (always-200 healthz) is correct and aligns with Compose's `service_healthy` semantics.

---

## patch (P)

19 unambiguous fixes. P4 absorbed D8 (CSP). P1 was deferred together with D1 (hardening pass).

- [ ] **P2 — Web healthcheck masks proxy failures** [`packages/web/Dockerfile:38`, `docker-compose.yml:web`]
  `wget /` returns 200 from cached `index.html` even if `/api/` upstream is down. Probe `/api/healthz` instead, or add a dedicated `location = /nginx-health`.

- [ ] **P3 — nginx hardening: body size, proxy timeouts, header buffers** [`packages/web/nginx.conf`]
  Add `client_max_body_size 16k;` (todos are tiny — also sets a deliberate cap matching Zod's 500-char limit), `client_body_timeout 10s;`, `client_header_timeout 10s;`, `proxy_connect_timeout 5s;`, `proxy_send_timeout 30s;`, `proxy_buffer_size 16k;`, `proxy_buffers 4 16k;`.

- [ ] **P4 — nginx headers: `server_tokens off;` + security headers (incl. CSP) + tighten `Host`** [`packages/web/nginx.conf`]
  `server_tokens off;`. `add_header X-Content-Type-Options nosniff always;`, `add_header X-Frame-Options DENY always;`, `add_header Referrer-Policy strict-origin-when-cross-origin always;`, `add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'" always;` (D8). Replace `proxy_set_header Host $host;` with `proxy_set_header Host $proxy_host;` for the internal upstream.

- [ ] **P5 — nginx error_page for upstream down** [`packages/web/nginx.conf`]
  `error_page 502 503 504 = @api_down; location @api_down { default_type application/json; return 503 '{"error":"upstream","message":"api unavailable","code":"upstream.unavailable"}'; }` — keeps the SPA's JSON contract on upstream failure instead of nginx's HTML default page.

- [ ] **P6 — Persistence script: isolate compose project name** [`scripts/test-persistence.sh`]
  Add `docker compose -p bmad_persistence_test ...` everywhere. Currently, running this script in a project where the user has `docker compose up`'d for any other reason wipes their data with the leading `down -v`.

- [ ] **P7 — Persistence script: trap signals beyond EXIT** [`scripts/test-persistence.sh:21`]
  `trap cleanup EXIT INT TERM HUP`. Ctrl-C currently leaves containers running.

- [ ] **P8 — Persistence script: don't swallow cleanup failures** [`scripts/test-persistence.sh:21-22`]
  Drop the `|| true`. Log the exit code from `docker compose down` before continuing.

- [ ] **P9 — Persistence script: stricter readiness probe** [`scripts/test-persistence.sh:24-33`]
  After `/healthz` returns 200, also `GET /api/todos` and require a 2xx with parseable JSON before declaring healthy. Closes the (theoretical) gap between "healthz answers" and "the route handlers can serve data."

- [ ] **P10 — Persistence script: jq for JSON construction + exact-match assertion** [`scripts/test-persistence.sh:46-49`]
  `jq -nc --arg t "$MARKER" '{text:$t}'` to build the body. After fetching, `jq -e --arg m "$MARKER" 'any(.text==$m)' <<<"$todos"` for exact match instead of `grep -q`. Stops false positives if the marker happens to be a substring of another todo, and stops shell injection if MARKER is ever overridden.

- [ ] **P11 — Persistence script: explicit failure on initial `down -v`** [`scripts/test-persistence.sh:38-39`]
  Currently `docker compose down -v >/dev/null 2>&1 || true`. If the volume is held by another stack, the script silently proceeds and round 1 reuses old data. Replace with an explicit check that returns failure (or warns + skips reset).

- [ ] **P12 — Persistence script: prerequisite check for `jq`** [`scripts/test-persistence.sh:1-7`]
  Add `command -v jq >/dev/null || fail "jq is required (brew install jq)"`. The README implies jq is needed; the script doesn't enforce it.

- [ ] **P13 — Persistence script: probe api directly, not via proxy** [`scripts/test-persistence.sh:24-33`]
  The script's `wait_healthy` hits the proxy (`http://localhost:8080/api/healthz`). The persistence test's purpose is to verify storage, not the proxy chain — switch to `docker compose -p ... exec api wget -qO- http://127.0.0.1:3000/healthz`.

- [ ] **P14 — Persistence script trap: end with `down -v`** [`scripts/test-persistence.sh:18-22`]
  After a successful run the named volume is left containing the marker. Trap should `down -v` so subsequent runs (and other developers) don't inherit it.

- [ ] **P15 — Dev overlay: api healthcheck unfixable in current dev image** [`docker-compose.dev.yml`, `packages/api/Dockerfile.dev`]
  Prod compose declares `healthcheck: wget …`. Dev overlay only disables the *web* healthcheck. `Dockerfile.dev` doesn't install `wget`, so the api healthcheck loops forever marking the container unhealthy. If you ever stack `docker-compose.dev.yml` with the test overlay (`e2e` depends on `service_healthy`), it deadlocks. Either disable the api healthcheck in the dev overlay, or `apk add --no-cache wget` in `Dockerfile.dev`.

- [ ] **P16 — Test overlay: pre-create host report dirs** [`docker-compose.test.yml:18-21`, `scripts/test-persistence.sh` (or a docs note)]
  `./packages/web/test-results` and `./packages/web/playwright-report` are bind-mounted. If the container is the first thing to write there, Docker creates them root-owned. Add `mkdir -p` in a tiny `pre-up` script or in the README's e2e command block.

- [ ] **P17 — README: clarify migrations-on-startup + DATABASE_URL semantics** [`README.md`]
  Current README lists `DATABASE_URL` as required for `api`, but in Compose the value is *constructed* from `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`. Also note that every `up` runs migrations on startup. Two short paragraphs in the README's env-var matrix.

- [ ] **P18 — Document `--ignore-scripts` choice** [Dockerfiles]
  Comment in the `RUN npm ci ...` line explaining that postinstall scripts are deliberately disabled (supply-chain hardening) and that the deps in this project don't require any. Cheap and avoids a future maintainer wondering.

- [ ] **P19 — `playwright.config.ts`: validate PLAYWRIGHT_BASE_URL when E2E_EXTERNAL_STACK=1** [`packages/web/playwright.config.ts`]
  If `E2E_EXTERNAL_STACK=1` and `PLAYWRIGHT_BASE_URL` is unset, tests silently fall back to `localhost:5173` and all fail. `if (useExternalStack && !process.env.PLAYWRIGHT_BASE_URL) throw new Error(...)`.

- [ ] **P20 — Promote test-overlay invocation flags to README** [`README.md`]
  The compose file's leading comment shows `--abort-on-container-exit --exit-code-from e2e`. README has the same line, but should also explain *why* — without those flags, Playwright failures don't surface as a non-zero exit.

---

## defer (F)

Pre-existing or out-of-scope-for-now.

- [x] **F1 — `db` service has no resource limits / log rotation / shm_size** — out of scope for v1 demo, would matter on a long-running stack.
- [x] **F2 — db healthcheck doesn't `select 1` as the app user** — `pg_isready` is the standard probe; `psql -c 'select 1'` adds a roundtrip on every interval.
- [x] **F3 — `wget` in the api image just for the healthcheck** — could be `node -e "require('http').get(...)"`. Fine optimisation; not a correctness issue.
- [x] **F4 — `E2E_EXTERNAL_STACK` strict equality with "1"** — accepted intentionally; document if helpful.
- [x] **F5 — Test overlay file ownership beyond pre-creating dirs** — running e2e as `${UID}:${GID}` and SELinux labels is a fuller fix; not required for the macOS dev path.

---

## dismissed (R)

False positives, verified clean, or noise.

- **R1 — `.env.example` missing from diff** — exists in the repo from the foundation commit; not in this diff because it wasn't changed.
- **R2 — empty `POSTGRES_PASSWORD` passes `:?`** — `${VAR:?}` (with colon) errors on unset *or empty*. Already covered.
- **R3 — `.env` not loaded by script** — Compose reads `.env` from the project root automatically.
- **R4 — Healthchecks use `127.0.0.1` not literal `localhost`** — functionally equivalent; `127.0.0.1` is more robust.
- **R5 — `WEB_PORT` may be bound on host** — operator concern, not a code defect.
- **R6 — README "Docker 29+" / "Compose v5.1" "don't exist"** — they do; that's what `docker --version` / `docker compose version` reported on this host.
- **R7 — Migrations on startup unverified** — verified: `packages/api/src/server.ts:9` calls `runMigrations()` before `app.listen()`.
- **R8 — pino JSON in `docker compose logs` unverified** — verified: `app.ts:24` only registers `pino-pretty` transport when `NODE_ENV === "development"`. Production emits raw JSON.
- **R9 — db start_period adequate** — verified empirically; sequenced healthy → healthy → started in the persistence run.
- **R10 — `tsx` caret pin** — npm lockfile pins the exact resolved version; `^4.19.0` in `package.json` doesn't relax that for reproducible installs.
