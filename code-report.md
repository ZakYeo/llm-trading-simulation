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

### 1. The Prisma repository still deserves monitoring for write amplification

File: `apps/api/src/modules/game/infrastructure/prisma/prisma-game-session.repository.ts`

The repository now uses keyed custody-position upserts and targeted deletes instead of deleting all custody rows on every save. That is a material improvement. It still loops through every agent with individual upserts:

- lines `156-160`

This is acceptable at MVP scale, but persistence cost is still coupled to aggregate size more than strict change size.

Recommendation:

- Keep the keyed custody persistence approach
- Revisit agent persistence if aggregate size grows enough for per-agent upserts to become a bottleneck
- Consider a dedicated persistence component for custody state if treasury complexity keeps increasing

### 2. Some provider wiring still warrants discipline

File: `apps/api/src/modules/agents/presentation/agents.providers.ts`

The provider wiring is cleaner than before: repository and gateway creation are now isolated in narrow factory functions, and the provider graph is covered by tests. The remaining concern is architectural discipline over time rather than an immediate hotspot.

Recommendation:

- Keep provider construction behind narrow factory functions and tokens
- Avoid letting future provider edits drift back toward large inline constructor logic

### 3. Some naming is technically correct but product-confusing

Examples:

- legacy transfer semantics had previously drifted from the user-facing product language
- helper names such as `wouldSettleAsBankerFundingTrader(...)` had to carry compensating logic because the action vocabulary was misleading

That migration is now underway with canonical payment-request terminology. The remaining risk is making sure the compatibility layer is removed cleanly once old aliases are no longer needed.

Recommendation:

- Finish the alias-removal phase once stored history, prompts, replay, tests, and frontend code no longer depend on the legacy names
- Keep the persistence-layer mapping isolated so the rest of the codebase can stay on canonical terminology

Proposed cleanup plan:

1. Keep canonical payment-request names as the only internal vocabulary
2. Retain the persistence compatibility mapping only at the Prisma boundary
3. Remove legacy aliases from shared contracts once stored/action payload compatibility is no longer required

## Priority Order

### High Priority

1. Remove legacy action-name aliases from shared contracts once the compatibility window is no longer needed

### Medium Priority

2. Revisit agent persistence if aggregate size grows enough for per-agent upserts to become a bottleneck

### Lower Priority

3. Keep provider wiring disciplined as new agent infrastructure is added

## Suggested Next Refactors

If I were sequencing this as a senior engineer, I would do it in this order:

1. Remove legacy action aliases from shared contracts after the compatibility window closes
2. Revisit agent persistence if write amplification becomes a real concern
3. Keep provider construction narrow and tested as the agent stack grows

## Final Take

This codebase is in a healthy MVP state and most of the major structural refactors from the original report are now complete. The main remaining risk is now the usual one for evolving systems: temporary compatibility paths can outlive their usefulness. If the legacy action aliases are retired deliberately, the codebase should remain straightforward to extend as the treasury and agent mechanics expand.
