#!/usr/bin/env sh
set -eu

TEST_DB_NAME="${TEST_DB_NAME:-llm_trading_simulation_test}"
TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}?schema=public}"

docker compose up -d postgres >/dev/null
docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT 'CREATE DATABASE ${TEST_DB_NAME}'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = '${TEST_DB_NAME}'
)\gexec
SQL

DATABASE_URL="$TEST_DATABASE_URL" corepack pnpm --filter @llm-sim/api exec prisma migrate reset --force >/dev/null
DATABASE_URL="$TEST_DATABASE_URL" corepack pnpm --filter @llm-sim/api exec prisma generate >/dev/null

printf 'Prepared test database: %s\n' "$TEST_DATABASE_URL"
