#!/usr/bin/env bash

set -euo pipefail

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
  src/modules/agents/presentation/rest/agents.openai.integration.spec.ts
