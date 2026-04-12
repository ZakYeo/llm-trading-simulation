# Code Report

## Scope

This review focuses on maintainability, clean code, naming, design patterns, and structural consistency across the current backend and frontend.

Representative files reviewed:

- `apps/api/src/modules/agents/application/use-cases/run-agent-communication-turn.use-case.ts`
- `apps/api/src/modules/agents/infrastructure/openai/openai-agent.gateway.ts`
- `apps/api/src/modules/agents/infrastructure/openai/openai-agent-system-context.builder.ts`
- `apps/api/src/modules/agents/presentation/agents.providers.ts`
- `apps/api/src/modules/game/application/ports/game-session-repository.port.ts`
- `apps/api/src/modules/game/application/use-cases/advance-game-round.use-case.ts`
- `apps/api/src/modules/game/domain/entities/game-session.ts`
- `apps/api/src/modules/game/infrastructure/prisma/prisma-game-session.repository.ts`
- `apps/api/src/modules/game/presentation/rest/mappers/game-session-response.mapper.ts`
- `apps/api/src/modules/replay/infrastructure/prisma/prisma-replay-read-model.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/lib/api.ts`

## Overall Assessment

The codebase is moving in a good direction:

- the module boundaries are broadly sensible
- domain concepts are explicit
- tests exist at unit and integration levels
- recent work on the OpenAI system-context builder was a good refactor

The main quality risk is not correctness so much as **product-language and contract coordination complexity**. The largest structural hotspots identified earlier have now been refactored, but the remaining work still crosses backend logic, prompts, replay, and frontend semantics. If naming and transport contracts drift, feature work will get slower and regressions will become easier to introduce.

## Strengths

- Clear modular split between `game`, `agents`, `replay`, and `shared`.
- Good use of immutable domain-style entities such as `GameSession` and value objects such as `Money`.
- Tests exist close to implementation and the project already uses integration tests for HTTP and replay flows.
- The new `OpenAiAgentSystemContextBuilder` is a strong step toward keeping prompt composition extensible.

## Findings

The report items from this review have now been implemented:

- `RunAgentCommunicationTurnUseCase` was decomposed into focused services
- `App.tsx` was split into smaller components and hooks
- replay mapping was typed and simplified
- shared transport contracts are now reused across apps
- misleading transfer action names were replaced with canonical payment-request terminology
- the temporary alias layer for legacy action names has been removed from shared contracts
- custody persistence now uses keyed upserts and targeted deletes instead of full row rewrites
- provider construction is narrower and covered by tests

## Ongoing Watchpoints

These are not active refactor items anymore, but they are worth monitoring as the product grows:

1. Agent persistence still uses per-agent upserts, which is acceptable at current scale but could become a bottleneck with much larger sessions.
2. Provider construction should stay behind narrow factories and tokens instead of drifting back toward large inline constructor logic.
3. The Prisma mapping layer remains the correct place to isolate persistence-specific naming and enum translation.

## Priority Order

There are no remaining high-priority refactor items from this report.

If the codebase grows in complexity, the next likely revisit points would be:

1. agent persistence performance under larger aggregate sizes
2. treasury persistence complexity if custody products become substantially richer
3. provider discipline as more agent runtimes or repositories are introduced

## Final Take

This codebase is in a healthy MVP state and the major structural refactors identified in this report are now complete. The remaining concerns are normal growth concerns rather than outstanding cleanup debt. If future changes preserve the same discipline around shared contracts, prompt semantics, persistence boundaries, and provider wiring, the codebase should remain straightforward to extend.
