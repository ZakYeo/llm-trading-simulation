#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)

if [ -f "${REPO_ROOT}/.env" ]; then
  set -a
  . "${REPO_ROOT}/.env"
  set +a
fi

TEST_DB_NAME="${TEST_DB_NAME:-llm_trading_simulation_test}"
TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}?schema=public}"

docker compose up -d postgres >/dev/null
docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<SQL
DROP DATABASE IF EXISTS ${TEST_DB_NAME} WITH (FORCE);
CREATE DATABASE ${TEST_DB_NAME};
SQL

ATTEMPTS=0
until docker compose exec -T postgres \
  psql -U postgres -d "${TEST_DB_NAME}" -c 'SELECT 1' >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))

  if [ "${ATTEMPTS}" -ge 10 ]; then
    echo "Test database ${TEST_DB_NAME} did not become ready in time." >&2
    exit 1
  fi

  sleep 1
done

DATABASE_URL="$TEST_DATABASE_URL" corepack pnpm --filter @llm-sim/api exec prisma migrate deploy >/dev/null

printf 'Prepared test database: %s\n' "$TEST_DATABASE_URL"
