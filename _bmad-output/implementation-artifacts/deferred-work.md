# Deferred work

A running list of TODOs we've consciously deferred. Each entry says **what** the work is, **why** we deferred it, and **when to reconsider**.

---

## Deferred from: code review of E4 (2026-04-29)

### From decision-needed items

- **TODO — Container capability hardening** *(was D1 / P1)*
  *What:* In `docker-compose.yml`, add `cap_drop: [ALL]`, `read_only: true` (with `tmpfs:` for `/tmp`, `/var/cache/nginx`, `/var/run`), `security_opt: ["no-new-privileges:true"]`, `pids_limit: 200` per service. In `packages/web/Dockerfile`, add `USER nginx` (or `USER 101:101`) for the runtime stage. Each setting needs a smoke run to confirm the workload still functions.
  *Why deferred:* Architecture § 11 phrases this as "where possible." For a single-user v1 demo not deployed anywhere shared, the value is small relative to the verification burden. The current image already runs `api` as `node` (non-root); the gap is mainly nginx-as-root and the container-level safeguards.
  *When to reconsider:* the moment this stack runs anywhere multi-tenant or internet-reachable. Same trigger as D6 (rate limiting).

- **TODO — Pin base images to digests** *(was D2)*
  *What:* Replace `FROM node:24-alpine` / `postgres:16-alpine` / `nginx:1.27-alpine` / `mcr.microsoft.com/playwright:v1.48.0-jammy` with their `@sha256:...` digests. Add Renovate config (or equivalent) to refresh digests on a cadence.
  *Why deferred:* Reproducible builds and supply-chain hardening matter when more than one operator builds the image. With one developer pulling fresh upstream tags on every build, the cost (Renovate config + a refresh discipline) outweighs the benefit.
  *When to reconsider:* on the first CI build, or as soon as any second operator (human or pipeline) starts producing images of this project.

- **TODO — nginx rate limiting and slow-loris mitigations** *(was D6)*
  *What:* In `packages/web/nginx.conf` add `limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;` and `limit_req zone=api burst=40 nodelay;` inside `location /api/`, plus `client_body_timeout 10s;` / `client_header_timeout 10s;` (those last two land in P3 and don't need to wait).
  *Why deferred:* Single-user demo, no public exposure expected. nginx defaults are not catastrophic for this profile.
  *When to reconsider:* when the stack is exposed to the public internet, or as part of the same pass as D1 hardening.

- **TODO — nginx DNS resolver block for upstream re-resolution** *(was D7)*
  *What:* Replace static `proxy_pass http://api:3000/;` with `resolver 127.0.0.11 valid=10s ipv6=off; set $upstream api:3000; proxy_pass http://$upstream/;` so nginx re-resolves `api` periodically instead of caching the boot-time IP.
  *Why deferred:* With `restart: unless-stopped` and Compose's stable internal DNS, the api IP doesn't change in normal operation. The fix addresses a rare failure mode (api recreation while nginx is up) that costs more in config complexity than it saves today.
  *When to reconsider:* when the api scales horizontally, or when blue/green / rolling deploys are introduced, or when api restarts during nginx uptime become routine.

### Pre-existing / out-of-scope items

- **TODO — `db` service resource and logging hygiene** *(was F1)*
  *What:* Set `mem_limit`, `cpus`, `shm_size: 256mb`, and `logging.driver: json-file` with `max-size`/`max-file` rotation on the db service.
  *Why deferred:* Out of scope for v1 demo. PostgreSQL with default `shm_size=64MB` is fine for a single-user todo workload; uncapped JSON-file logging fills disk only on long-running stacks.
  *When to reconsider:* the moment the stack is expected to live for >1 day in any one place.

- **TODO — `db` healthcheck verifies queryable as the app user** *(was F2)*
  *What:* Replace `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` with `pg_isready ... && psql -c 'select 1'` (or the api's startup probe loop).
  *Why deferred:* `pg_isready` is the standard probe. The extra `psql -c 'select 1'` roundtrip on every healthcheck interval is over-spec for the failure mode it catches (postmaster up but role/db not ready), and the api itself fails fast on startup if the db isn't usable.
  *When to reconsider:* if cold-start migration failures become a recurring issue.

- **TODO — `wget` removed from healthchecks in favor of `node -e`** *(was F3)*
  *What:* In `packages/api/Dockerfile`, drop the `apk add --no-cache wget` line and switch the HEALTHCHECK CMD to `node -e "require('http').get('http://127.0.0.1:3000/healthz', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"`. Same transformation possible (with httpx via node) for the web image, though wget is needed there only because nginx's base image already has it. Trickier: dev images may also benefit.
  *Why deferred:* Pure optimisation — drops one binary's worth of attack surface and a few KB. Not a correctness issue.
  *When to reconsider:* during a general image-slimming pass, e.g., when distroless is on the table.

- **TODO — `E2E_EXTERNAL_STACK` accepts `"true"` / `"yes"` / case-insensitive variants** *(was F4)*
  *What:* In `packages/web/playwright.config.ts`, replace `process.env.E2E_EXTERNAL_STACK === "1"` with a normalised parse (`["1", "true", "yes"].includes(...)` after lowercasing).
  *Why deferred:* The strict equality is intentional. The compose overlay sets it to literal `"1"`. A user passing a different truthy variant gets the safe-default behavior (local webServer spawns, port collides with compose, fails loudly) — annoying but explicit.
  *When to reconsider:* if confusion shows up in practice (e.g., a CI provider injects `CI=true` style truthy values that someone tries to reuse).

- **TODO — Test overlay file ownership beyond pre-creating dirs** *(was F5)*
  *What:* Run the e2e container as `${UID}:${GID}` (`user: "${UID}:${GID}"` in `docker-compose.test.yml`) and add SELinux labels (`:z` / `:Z`) to the bind mounts in `packages/web/test-results` / `packages/web/playwright-report`.
  *Why deferred:* Pre-creating the report dirs (P16) is enough for the macOS development path that this project actually uses. The fuller fix is real on Linux hosts with SELinux enforcing or rootless docker, neither of which is in the v1 target environment.
  *When to reconsider:* when CI runs on a Linux runner with SELinux, or when a Linux developer joins the project.

---

## Deferred from: code review of E5-S4 security review (2026-04-29)

These are the **Low** items from `docs/qa/security.md` that are real but explicitly out of scope for the current epic. The **High** and **Medium** items in the same report are not deferred — they should be patched before E5-S4 closes (or a deliberate option-B/option-C decision is recorded).

- **TODO — Production runtime via built JS instead of `tsx` loader** *(was L6)*
  *What:* Add a TypeScript build step (`tsc -p packages/api/tsconfig.build.json`) and run `node dist/server.js` instead of `tsx src/server.ts` in the api Dockerfile.
  *Why deferred:* The architecture explicitly chose `tsx` at runtime to keep the build pipeline minimal in v1 (see ai-integration-log Step 3 reasoning). The cost is one extra runtime dep and a slightly larger surface; the benefit is a one-step Dockerfile.
  *When to reconsider:* same trigger as D1 — first multi-tenant or internet-reachable deployment.

- **TODO — Strip `Server: nginx` token entirely** *(was L7)*
  *What:* Switch to `nginx-extras` (`more_clear_headers Server;`) or front the stack with a CDN that strips it.
  *Why deferred:* `server_tokens off` already removes the version. Hiding the server type is fingerprint-resistance, not a real vulnerability.
  *When to reconsider:* when the stack is exposed to the public internet alongside D6's rate limiting.

- **TODO — Document backup / encryption-at-rest for `db_data` volume** *(was L9)*
  *What:* Add an operational README section covering volume backups (e.g., `pg_dump` cron, snapshotting) and choose an encrypted-volume driver if the host is shared.
  *Why deferred:* Pure operational concern — no code change. Not relevant on a developer laptop.
  *When to reconsider:* when the stack lives on a shared or production host.

- **TODO — Trim leading/trailing whitespace check verification on shared schema** *(was L11)*
  *What:* Read `packages/shared/src/todo.ts` to confirm `CreateTodoSchema` uses `z.string().trim().min(1).max(500)` (the client trims; the server schema must trim before length validation to avoid divergence on a 500-char input plus whitespace). If it doesn't, add `.trim()`.
  *Why deferred:* Five-minute verification, but doing it after the H1–H11 patch sweep avoids merging two unrelated diffs.
  *When to reconsider:* during the patch sweep for the High findings.

- **TODO — Trailing newline on migration metadata files** *(was L12)*
  *What:* Add a final newline to `packages/api/src/db/migrations/meta/0000_snapshot.json` and `packages/api/src/db/migrations/meta/_journal.json`.
  *Why deferred:* Cosmetic. Some linters complain.
  *When to reconsider:* if a pre-commit hook starts enforcing trailing newlines.

- **TODO — Update architecture.md § 11 to qualify the non-root requirement** *(spec deviation, no code change)*
  *What:* The architecture text reads "Run as a non-root user (`USER node` for api, `USER nginx` for web)" without qualification. The actual posture defers `USER nginx` (see D1). Either lift the deferral or reword the architecture to "where possible" to match. The Acceptance Auditor flagged this in the security review as "Deferred-but-load-bearing" because of the unconditional spec language.
  *Why deferred:* Doc fix, not a code fix. Bundle with the next architecture amendment cycle.
  *When to reconsider:* same time D1 is reconsidered, so the doc and code move together.
