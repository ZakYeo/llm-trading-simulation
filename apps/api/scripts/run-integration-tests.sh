#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

if [ -f "${REPO_ROOT}/.env" ]; then
  set -a
  . "${REPO_ROOT}/.env"
  set +a
fi

TEST_DB_NAME="${TEST_DB_NAME:-llm_trading_simulation_test}"
TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}?schema=public}"

export TEST_DATABASE_URL

vitest run --config vitest.integration.config.ts \
  src/modules/game/infrastructure/prisma/prisma-game-session.repository.integration.spec.ts

vitest run --config vitest.integration.config.ts \
  src/modules/game/application/use-cases/game-flows.integration.spec.ts

vitest run --config vitest.integration.config.ts \
  src/modules/game/presentation/rest/game.http.integration.spec.ts

vitest run --config vitest.integration.config.ts \
  src/modules/replay/presentation/rest/replay.http.integration.spec.ts

vitest run --config vitest.integration.config.ts \
  src/modules/agents/presentation/rest/agents.http.integration.spec.ts

vitest run --config vitest.integration.config.ts \
  src/modules/agents/presentation/rest/agents.consistency.integration.spec.ts

vitest run --config vitest.integration.config.ts \
  src/modules/agents/presentation/rest/agents.openai.integration.spec.ts
