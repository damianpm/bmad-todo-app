#!/usr/bin/env bash
# Verify that todos survive `docker compose down` + `docker compose up`.
# Scripted persistence test referenced in architecture § 11 / Epic E4.
#
# Prereqs: docker, docker compose v2, jq, curl, and POSTGRES_PASSWORD in env or
# in a project .env file (Compose reads it automatically).
#
# Runs under a dedicated compose project name (`bmad_persistence_test`) so it
# never touches the user's main stack or any other compose project.

set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT="bmad_persistence_test"
COMPOSE=(docker compose -p "$PROJECT")
WEB_PORT="${WEB_PORT:-8080}"
API_BASE="http://localhost:${WEB_PORT}/api"
MARKER="persistence-check-$(date +%s)-$$"

log()  { printf '\033[36m[persistence]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[persistence]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[31m[persistence FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

command -v jq   >/dev/null || fail "jq is required (brew install jq)"
command -v curl >/dev/null || fail "curl is required"

cleanup() {
  local rc=$?
  log "tearing down (project=$PROJECT, removing volume)"
  if ! "${COMPOSE[@]}" down -v >/dev/null 2>&1; then
    warn "teardown returned non-zero (containers may already be stopped)"
  fi
  exit "$rc"
}
trap cleanup EXIT INT TERM HUP

# Probe the api container directly (not via the nginx proxy) and follow up with
# a real GET /todos so we know the route handlers are serving, not just that
# the api process is bound to its port.
wait_ready() {
  local timeout="${1:-180}"
  local elapsed=0
  while (( elapsed < timeout )); do
    if "${COMPOSE[@]}" exec -T api wget -qO- http://127.0.0.1:3000/healthz >/dev/null 2>&1 \
       && curl -fsS "${API_BASE}/todos" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

log "starting from a clean slate (down -v on project=$PROJECT)"
"${COMPOSE[@]}" down -v >/dev/null 2>&1 \
  || fail "could not reset $PROJECT (volume held by another stack?)"

log "stack up (round 1)"
"${COMPOSE[@]}" up -d --build

log "waiting for stack to become ready"
wait_ready 180 || fail "stack did not become ready in time (round 1)"

log "creating a marker todo: ${MARKER}"
body="$(jq -nc --arg t "$MARKER" '{text:$t}')"
created="$(curl -fsS -X POST "${API_BASE}/todos" \
  -H 'Content-Type: application/json' \
  --data "$body")"
echo "$created" | jq -e --arg m "$MARKER" '.text == $m' >/dev/null \
  || fail "marker not in POST response"

log "stop containers (KEEP the named volume)"
"${COMPOSE[@]}" down

log "stack up (round 2 — same volume)"
"${COMPOSE[@]}" up -d

log "waiting for stack to become ready again"
wait_ready 180 || fail "stack did not become ready after restart"

log "fetching todos and asserting marker survived"
todos="$(curl -fsS "${API_BASE}/todos")"
echo "$todos" | jq -e --arg m "$MARKER" 'any(.text == $m)' >/dev/null \
  && log "PASS — marker survived restart" \
  || fail "marker missing after restart; data did not persist"
