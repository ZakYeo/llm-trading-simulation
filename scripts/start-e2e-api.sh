#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

docker compose up -d postgres >/dev/null

export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/llm_trading_simulation_test?schema=public}"
export DATABASE_URL="${DATABASE_URL:-${TEST_DATABASE_URL}}"
export PORT="${PORT:-3100}"
export AGENT_RUNTIME_PROVIDER="${AGENT_RUNTIME_PROVIDER:-mock}"
export AGENT_MOCK_SCENARIO="${AGENT_MOCK_SCENARIO:-market_opportunity}"

corepack pnpm db:test:prepare >/dev/null
corepack pnpm --filter @llm-sim/api exec tsx src/main.ts
