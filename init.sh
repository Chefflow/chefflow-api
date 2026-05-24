#!/usr/bin/env bash
# init.sh — Harness Guardian
# MUST run successfully before any agentic task is started.
# Exit 0 → harness is "active". Any non-zero → block the workflow.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log()  { printf "\033[1;34m[init]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m  ok\033[0m  %s\n" "$*"; }
warn() { printf "\033[1;33m  warn\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m  fail\033[0m %s\n" "$*" >&2; exit 1; }

# ── 1. Environment health ─────────────────────────────────────────────────
log "checking environment"
command -v node >/dev/null    || fail "node not found"
command -v pnpm >/dev/null    || fail "pnpm not found (engines.pnpm >=10)"
node -v | grep -qE '^v(2[4-9]|[3-9][0-9])' || fail "node >=24 required, got $(node -v)"
ok "node $(node -v) · pnpm $(pnpm -v)"

[ -f .env ] || warn ".env missing — copy .env.example if needed"
[ -d node_modules ] || fail "dependencies not installed — run: pnpm install"
ok "dependencies present"

# ── 2. Prisma client in sync ──────────────────────────────────────────────
log "verifying prisma client"
if [ ! -d generated/prisma ] && [ ! -d node_modules/.prisma/client ]; then
  warn "prisma client not generated — running pnpm prisma:generate"
  pnpm run prisma:generate >/dev/null || fail "prisma generate failed"
fi
ok "prisma client ok"

# ── 3. Harness memory files ───────────────────────────────────────────────
log "checking harness memory"
[ -f features.json ]              || fail "features.json missing — harness not scaffolded"
[ -d specs ]                      || fail "specs/ missing — harness not scaffolded"
[ -d progress ]                   || mkdir -p progress
[ -f progress/history.md ]        || : > progress/history.md
[ -d .claude/agents ]             || fail ".claude/agents/ missing — subagents not configured"
ok "memory files ok"

# ── 4. Pre-task test gate ─────────────────────────────────────────────────
# Skip with SKIP_TESTS=1 only when explicitly requested by user.
if [ "${SKIP_TESTS:-0}" = "1" ]; then
  warn "SKIP_TESTS=1 — skipping pre-task test gate"
else
  log "running unit test suite (pre-task gate)"
  if ! pnpm run test --silent >/tmp/init-tests.log 2>&1; then
    tail -40 /tmp/init-tests.log >&2
    fail "unit tests are failing — fix before starting a new task"
  fi
  ok "unit tests green"
fi

log "harness ACTIVE ✓"
