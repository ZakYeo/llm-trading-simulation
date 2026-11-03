#!/bin/sh
set -eu
cd -- "$(dirname -- "$0")"
set -a
. ./.env
set +a
docker compose up -d --wait postgres
corepack pnpm db:migrate:deploy
exec corepack pnpm dev
