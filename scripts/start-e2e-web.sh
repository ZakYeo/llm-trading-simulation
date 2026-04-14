#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://127.0.0.1:3100/api}"

mkdir -p "${REPO_ROOT}/tmp/vite-e2e-cache"

corepack pnpm --filter @llm-sim/web exec vite --config vite.e2e.config.ts
