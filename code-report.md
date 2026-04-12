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

### 1. The Prisma repository rewrites too much state on each save

File: `apps/api/src/modules/game/infrastructure/prisma/prisma-game-session.repository.ts`

The repository deletes and recreates all banker custody positions on every update:

- lines `162-174`

It also loops through every agent with individual upserts:

- lines `156-160`

This is acceptable at MVP scale, but it creates avoidable churn and makes write behavior less transparent. It also couples persistence cost to aggregate size rather than actual change size.

Recommendation:

- Move toward delta-based persistence for custody positions
- Consider a dedicated persistence component for custody state
- If full replacement stays for now, document it explicitly because it has performance and concurrency implications

### 2. Provider wiring is more concrete than it should be

File: `apps/api/src/modules/agents/presentation/agents.providers.ts`

The DI layer still relies on concrete classes in several places:

- `PrismaAgentActionRepository`
- `PrismaAgentMessageRepository`
- `MockAgentGateway | OpenAiAgentGateway`

See lines `56-65` and `86-92`.

This works, but it weakens the architectural separation implied by the ports. Provider factories should depend on ports/tokens where possible, not on concrete implementation details.

Recommendation:

- Use port types and tokens consistently in provider signatures
- Keep environment selection logic, but hide concrete classes behind narrower interfaces

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

1. Revisit persistence churn in `PrismaGameSessionRepository`

### Medium Priority

2. Tighten any remaining DI usage that still depends on concrete classes

### Lower Priority

3. Remove legacy action-name aliases from shared contracts once the compatibility window is no longer needed
4. Consider delta-based persistence for banker custody positions

## Suggested Next Refactors

If I were sequencing this as a senior engineer, I would do it in this order:

1. Revisit custody persistence churn if write amplification becomes a real concern
2. Remove legacy action aliases from shared contracts after the compatibility window closes
3. Tighten any remaining DI sites that still expose concrete implementations unnecessarily

## Final Take

This codebase is in a healthy MVP state and most of the major structural refactors from the original report are now complete. The main remaining risks are more operational than architectural: write amplification in persistence, and the discipline to remove temporary compatibility layers once migrations have landed. If those are handled deliberately, the codebase should remain straightforward to extend as the treasury and agent mechanics expand.
