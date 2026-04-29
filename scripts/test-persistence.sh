#!/usr/bin/env bash
# Verify that todos survive `docker compose down` + `docker compose up`.
# This is the E2E persistence test referenced in architecture § 11 / Epic E4.
#
# Prereqs: docker, docker compose v2, jq, and a project .env with POSTGRES_PASSWORD.

set -euo pipefail

cd "$(dirname "$0")/.."

WEB_PORT="${WEB_PORT:-8080}"
API_BASE="http://localhost:${WEB_PORT}/api"
MARKER="persistence-check-$(date +%s)"

log() { printf '\033[36m[persistence]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[persistence FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

cleanup() {
  log "tearing down (preserving volume)"
  docker compose down >/dev/null 2>&1 || true
}
trap cleanup EXIT

wait_healthy() {
  local timeout="${1:-90}"
  local elapsed=0
  while (( elapsed < timeout )); do
    if curl -fsS "${API_BASE}/healthz" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

log "starting from a clean slate (down -v)"
docker compose down -v >/dev/null 2>&1 || true

log "stack up (round 1)"
docker compose up -d --build

log "waiting for stack to become healthy"
wait_healthy 120 || fail "stack did not become healthy in time"

log "creating a marker todo: ${MARKER}"
created=$(curl -fsS -X POST "${API_BASE}/todos" \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"${MARKER}\"}")
echo "${created}" | grep -q "${MARKER}" || fail "marker not in POST response"

log "down (keeping the named volume)"
docker compose down

log "stack up (round 2 — same volume)"
docker compose up -d

log "waiting for stack to become healthy again"
wait_healthy 120 || fail "stack did not become healthy after restart"

log "fetching todos and looking for marker"
todos=$(curl -fsS "${API_BASE}/todos")
if echo "${todos}" | grep -q "${MARKER}"; then
  log "PASS — marker survived restart"
else
  fail "marker missing after restart; data did not persist"
fi
