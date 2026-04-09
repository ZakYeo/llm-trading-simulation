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

The main quality risk is not correctness so much as **growing coordination complexity**. Several core flows are now concentrated in a few large files, and infrastructure contracts are becoming event-type-specific. If this continues, feature work will get slower and regressions will become easier to introduce.

## Strengths

- Clear modular split between `game`, `agents`, `replay`, and `shared`.
- Good use of immutable domain-style entities such as `GameSession` and value objects such as `Money`.
- Tests exist close to implementation and the project already uses integration tests for HTTP and replay flows.
- The new `OpenAiAgentSystemContextBuilder` is a strong step toward keeping prompt composition extensible.

## Findings

### 1. `RunAgentCommunicationTurnUseCase` is doing too much

File: `apps/api/src/modules/agents/application/use-cases/run-agent-communication-turn.use-case.ts`

This file is currently 680 lines long and mixes:

- prompt/context assembly
- negotiation-state derivation
- treasury-context derivation
- validation
- action persistence
- message persistence
- custody execution
- event publication

Examples:

- context construction inside the main loop at lines `359-455`
- action validation and branching at lines `457-568`
- persistence and side effects at lines `570-617` and below

This is the clearest “god object” in the codebase. It is still understandable today, but it is already carrying several independent responsibilities. Every new agent action will make this class harder to reason about.

Recommendation:

- Extract a `AgentTurnContextFactory`
- Extract an `AgentActionValidator`
- Extract an `AgentActionExecutor`
- Keep the use case as orchestration glue only

### 2. The repository port is growing by event type instead of modeling persistence more generically

File: `apps/api/src/modules/game/application/ports/game-session-repository.port.ts`

The repository interface now contains:

- `saveWithTransfer`
- `saveWithDeposit`
- `saveWithWithdrawal`
- `saveWithCustodyPlacement`
- `saveWithCustodyRedemption`
- `saveWithCustodyAccruals`

This is a design smell. Every new history/event type forces a port change, an implementation change, and downstream wiring changes.

That is a sign the abstraction is too specific to current event storage mechanics.

Recommendation:

- Introduce a more generic persistence model, such as:
  - `save(session, domainEvents[])`
  - or a `UnitOfWork`
  - or a separate ledger/history writer port
- Keep `GameSessionRepositoryPort` focused on aggregate persistence and retrieval

### 3. The Prisma repository rewrites too much state on each save

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

### 4. The replay read model uses unsafe typing and a large in-memory assembly step

File: `apps/api/src/modules/replay/infrastructure/prisma/prisma-replay-read-model.ts`

Two issues stand out:

- unsafe casting of the Prisma delegate:
  - lines `104-112`
- large manual event assembly and sorting in memory:
  - lines `115-190`
  - lines `197-331`

The unsafe cast weakens type safety exactly where infrastructure correctness matters. The manual event-building block is also becoming a second “god function”.

Recommendation:

- Replace the `unknown as` delegate cast with a typed query abstraction or a properly typed repository helper
- Extract event mapping into small functions per event family
- Consider pagination or streamed replay reads if session histories grow

### 5. The frontend `App.tsx` is too large and owns too many concerns

File: `apps/web/src/App.tsx`

This file is 703 lines long and currently owns:

- API query orchestration
- mutation handling
- SSE subscription lifecycle
- session form state
- event formatting
- treasury calculations
- most of the rendered UI

Examples:

- event formatting helpers at lines `46-117`
- query/mutation setup at lines `132-180`
- derived treasury/session state at lines `182-211`
- SSE lifecycle at lines `244-333`
- all UI rendering at lines `335-703`

This makes the frontend harder to evolve than it needs to be.

Recommendation:

- Split into focused components:
  - `SessionControls`
  - `SessionSnapshot`
  - `TreasuryOverview`
  - `ReplayTimeline`
- Move SSE logic into a custom hook such as `useSessionEvents`
- Move formatting helpers into `lib/formatters.ts`

### 6. Frontend types duplicate backend/shared contracts manually

File: `apps/web/src/lib/api.ts`

The frontend manually defines transport types such as:

- `ReplayEventRecord`
- `AgentSessionEventRecord`
- `GameSessionRecord`

This duplicates backend response shapes and action enums. The risk is silent drift: the frontend can compile while the backend contract changes underneath it.

Recommendation:

- Promote API DTO types into a shared package, or
- generate typed clients from shared schemas, or
- at minimum centralize response schemas with runtime validation on the frontend

The current setup is workable, but it will become brittle as replay and agent actions continue to evolve.

### 7. Provider wiring is more concrete than it should be

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

### 8. The domain model and UI still expose legacy deposit concepts that are no longer central to the current product

Files:

- `apps/api/src/modules/game/presentation/rest/mappers/game-session-response.mapper.ts`
- `apps/web/src/App.tsx`

The API still returns per-agent:

- `depositPrincipal`
- `depositAccruedInterest`

See mapper lines `10-18`.

The frontend then renders those values directly:

- `App.tsx` lines `570-577`

Given the current banker/trader direction, custody is now the more meaningful mechanic. Keeping both models visible without a clear product distinction increases cognitive load and can confuse operators.

Recommendation:

- Either hide legacy deposit balances from the primary UI
- or relabel them clearly as a separate mechanic
- or remove them from operator-facing responses if they are no longer part of the intended experience

### 9. Some naming is technically correct but product-confusing

Examples:

- `propose_direct_transfer` means “recipient pays proposer”
- `wouldSettleAsBankerFundingTrader(...)` in `run-agent-communication-turn.use-case.ts` lines `305-318`

The code now documents the semantics better than before, but the action name itself still invites incorrect mental models. This is a product-language problem as much as a code problem.

Recommendation:

- Consider renaming transfer actions in shared contracts to something closer to actual mechanics, such as `request_payment` / `counter_payment_request`
- If renaming is too expensive right now, keep tightening helper names and prompt wording

## Priority Order

### High Priority

1. Decompose `RunAgentCommunicationTurnUseCase`
2. Split `App.tsx` into components/hooks
3. Stop growing `GameSessionRepositoryPort` by event subtype

### Medium Priority

4. Clean up unsafe casts and large mapping blocks in `PrismaReplayReadModel`
5. Move frontend API DTOs toward shared/generated contracts
6. Tighten DI to depend on ports instead of concrete classes

### Lower Priority

7. Revisit operator-facing exposure of legacy deposit fields
8. Improve action naming to better match business semantics

## Suggested Next Refactors

If I were sequencing this as a senior engineer, I would do it in this order:

1. Extract `AgentTurnContextFactory`, `AgentActionValidator`, and `AgentActionExecutor`
2. Break `App.tsx` into presentational sections and a small session-events hook
3. Introduce a generic session-save plus history-events persistence API
4. Move replay event mapping into dedicated mapper helpers
5. Create a shared API-contract package for frontend DTOs

## Final Take

This codebase is in a healthy MVP state, but it is at the point where the next wave of features will either benefit from structural refactors or make the core orchestration files noticeably harder to maintain. The biggest risk is not low code quality; it is **concentration of responsibility** in a few central files and interfaces. Addressing that now will keep the project moving quickly as the agent and treasury mechanics expand.
