a multi-agent negotiation and treasury simulator where each agent is exposed as its own MCP server, communicates through MCP-compatible tools/resources, and operates on fake balances first, with a clean migration path toward x402-based testnet payments later. MCP is an open standard for connecting AI applications to tools, data, and workflows, which makes it a good fit for agent-to-agent interaction boundaries. x402 is designed around HTTP 402 Payment Required challenge/response flows, which makes it a sensible later-stage payment layer for monetized agent actions or paid resource access.

Execution tracker

Current phase: Phase 3 — Frontend MVP and operator experience
Status: in progress

Quality status:

- green workspace on `lint`, `test`, `typecheck`, and `build`
- unit tests cover money, ledger, session creation, bank mutations, transfers, and Prisma mapping/repository adapters
- Docker-isolated local runtime is working for API, web, and Postgres
- Docker Compose now passes OpenAI agent runtime env vars into the API container so manual containerized runs can use the real provider
- Prisma migration and test database bootstrap flow now exist
- the API integration runner now executes the integration files sequentially so a shared Postgres test database stays stable
- real Postgres-backed integration coverage now exists for repository persistence and the main create-session -> transfer -> deposit -> withdraw -> read-state backend flow
- real Postgres-backed HTTP integration coverage now exists for create, read, transfer, deposit, and withdraw through the live Nest app boundary
- round advancement with interest accrual is now implemented and covered through unit, Postgres-backed integration, and HTTP integration tests
- session updates now preserve the `GameSession` row and durable `GameRound` history in Postgres
- transfer, deposit, and withdrawal actions now persist durable ledger history rows in Postgres
- replay-oriented read models and API endpoints now exist over stored round and ledger history
- backend-only agent communication now exists with persisted public/private messages
- backend-only round orchestration now exists across multiple turns with persisted agent action records
- accepted transfer proposals now resolve into real transfer mutations through the existing game flow
- counter-proposals now exist as a first negotiation-deepening primitive, with accepted counters resolving through the same validated transfer path
- rejected transfer proposals are covered and remain replay-visible without mutating balances
- OpenAI is now wired behind an `AgentGatewayPort`, with mock runtime selection available for deterministic tests
- a gated live OpenAI integration test now exists for the agents orchestration HTTP path, now running against `gpt-4.1-mini` with incentive-based prompting, per-agent reasoning logs, and repeated short-run confidence checks
- live-provider runs now demonstrate real non-passive interaction with clearer role separation: banker/trader handle most bilateral negotiation while analyst/lawyer/influencer mostly stay public
- negotiation-state cues now help banker/trader convert bilateral discussion into executable proposal/acceptance actions earlier in the round
- live-provider runs now produce valid proposal and acceptance actions often enough to pass repeated confidence checks, but the behavior remains non-deterministic

Readiness assessment:

- close to a real fake-money backend MVP
- already at the first credible backend agent-communication milestone
- strong enough to demo backend-only agent interaction through HTTP, replay, and live-provider smoke coverage
- backend is now strong enough that frontend visibility is the highest-value next multiplier
- still not yet close to the full MCP multi-agent system with standalone agent servers and generalized negotiated multi-turn resolution
- OpenAI credentials are now usable through the backend agent gateway, but the current implementation is still an orchestration slice rather than a full agent runtime

Completed this session:

- created pnpm workspace root, shared tsconfig, eslint, prettier, and husky scaffolding
- scaffolded `apps/api` for a NestJS orchestrator structure
- scaffolded `apps/web` for a React + Vite frontend structure
- added shared packages for MCP contracts and common types
- added initial Prisma schema and Docker Compose Postgres setup
- installed workspace dependencies and fixed the local `pnpm` execution path via `corepack`
- implemented initial money, balance, deposit-account, and ledger domain primitives with tests
- added game session creation, deposit, withdrawal, and transfer application use cases
- added Prisma mapper and repository adapter coverage for game sessions
- tightened MVP invariants so sessions require the five core roles and transfers reject self-transfer
- wired NestJS providers for Prisma, repository, and core game use cases
- added a validated session-creation API endpoint
- added validated session-read, deposit, withdrawal, and transfer API endpoints
- added a Docker-first isolated runtime and verified it against the running stack
- added Prisma migration files plus a test database bootstrap script
- added a Postgres-backed repository integration test and generic integration test runner
- added a Postgres-backed money-flow integration test proving persisted balance transitions end to end
- fixed the Prisma session repository write path so repeated aggregate saves succeed against a real database
- added shared Nest app bootstrap configuration plus HTTP exception mapping for Zod and domain errors
- added Postgres-backed HTTP integration tests for the game endpoints
- added round advancement and interest-accrual application behavior plus validated API coverage
- rewrote the Prisma session repository update path so it preserves session identity and persists round history instead of deleting and recreating the parent row
- added explicit ledger-history persistence for transfer, deposit, and withdrawal flows through the repository port and Prisma adapter
- added replay read-model plumbing plus a replay HTTP endpoint over durable stored history
- added minimal MCP-style agent message/action contracts for backend orchestration
- added `AgentGatewayPort`, mock agent runtime, and OpenAI-backed agent gateway wiring
- added a backend communication-turn use case plus `POST /api/agents/sessions/:id/turns/communicate`
- added durable agent-message persistence and replay exposure for stored public/private messages
- added unit and Postgres-backed HTTP integration coverage for the agent communication slice
- added `POST /api/agents/sessions/:id/rounds/orchestrate` for multi-turn backend orchestration
- added durable agent action persistence for message sends, transfer proposals, proposal accept/reject decisions, and finalize-turn decisions
- extended replay reads so stored agent actions are visible alongside ledger and message history
- added unit and Postgres-backed HTTP integration coverage for multi-turn orchestration
- resolved accepted direct-transfer proposals through the existing validated transfer use case
- added replay and HTTP integration coverage proving proposal -> acceptance -> persisted transfer state changes
- added rejected-proposal coverage plus duplicate-resolution safeguards in unit and HTTP integration tests
- added a gated real-OpenAI integration test that exercises the live agents orchestration path against the HTTP app boundary
- added counter-proposals as a richer negotiation primitive with unit, replay, and Postgres-backed HTTP integration coverage
- strengthened the gated live OpenAI test prompting and assertions so it detects non-passive interaction without forcing a specific move
- shifted live-provider prompting toward incentive-based behavior so agents optimize for expected fake-money outcome rather than following overly prescriptive action prompts
- added logging of each live-provider agent decision and short reasoning for debugging and evaluation
- enriched the live-provider context with economic semantics, actionable proposals for the current agent, and clearer descriptions of what each action does
- refined role-level prompting so banker/trader are the main capital negotiators while analyst/lawyer/influencer bias toward public information leverage
- added negotiation-state cues so banker/trader know when conversation is still exploratory versus ready for an executable transfer proposal
- upgraded the live-provider integration from a single-run smoke test to a repeated short-run confidence test

Immediate next steps:

- make the frontend the highest priority and turn the current backend MVP into a visible, operable product surface
- build the web app in React with Vite and test it with Vitest plus Testing Library
- wire the frontend to live session, orchestration, and replay endpoints before adding new backend negotiation primitives
- use a light UI framework/component layer; recommendation: `shadcn/ui` over a heavier all-in-one framework because it fits the repo’s current control/flexibility needs
- keep deterministic mock tests as the main backend regression suite while the live-provider path remains a targeted confidence check
- after the frontend MVP is useful, revisit backend turn-state refresh and deeper negotiation behavior

Banker treasury redesign plan

Goal:

- make the banker role economically real by making banker-held custody the only path that accrues interest
- keep the source of truth in backend state, not in model memory or prompt-only bookkeeping
- ship this in small slices so the system stays testable throughout

Why this is a better direction:

- if every agent can accrue interest on its own deposit account, the banker is mostly narrative rather than mechanical
- if only banker-held funds accrue, traders and other agents have a structural reason to negotiate with the banker
- this makes banker/trader interaction more legible in replay, prompts, and future frontend UX

Non-goals for the first slices:

- do not ask the banker model to maintain balances from memory
- do not make message content the source of truth for custody or obligations
- do not jump straight to a generalized multi-party treasury with spreads, lockups, or default logic

Target end state:

- the backend owns a banker-custody ledger
- non-banker agents can place funds with the banker
- only banker-held custodial funds accrue interest
- the backend tracks beneficial ownership per agent
- banker return or redemption actions are validated against that ownership ledger
- the banker sees treasury state in its turn context, but cannot invent it

Step-by-step implementation plan

Step 1 — smallest viable rules change

- remove universal per-agent interest accrual
- make round advancement accrue interest only on capital held in the banker treasury
- keep this first slice backend-only and deterministic
- for the first cut, it is acceptable if banker treasury state is still represented with a simple explicit ledger rather than a full new subdomain

Implementation notes:

- change `AdvanceGameRoundUseCase` so it no longer accrues each agent deposit account uniformly
- introduce a banker-treasury accrual path that computes interest only over banker-controlled custodial balances
- add unit coverage that proves non-banker idle balances do not accrue
- add integration coverage that proves banker-held custody does accrue

Step 2 — introduce explicit custody state

- add durable backend state for banker-held funds by beneficial owner
- recommended shape: one treasury account owned by the banker plus per-owner custody positions
- track principal and accrued return separately for each beneficial owner

Implementation notes:

- represent custody in a way that supports replay and validation cleanly
- avoid storing this only as derived transfer history if that makes redemption logic ambiguous
- prefer explicit persistence over inference-heavy reads

Step 3 — add banker custody actions

- add explicit backend operations for placing funds with the banker and redeeming them
- do not overload plain peer-to-peer transfer semantics forever if custody and redemption become first-class gameplay
- keep validation strict: the banker can only redeem up to the owner’s tracked balance

Implementation notes:

- first version can still be orchestrated through existing proposal/transfer flows if needed, but the state transition should resolve into treasury ledger mutations, not ordinary free-form balances alone
- add domain invariants so over-redemption is impossible
- preserve replay visibility for both custody placement and redemption

Step 4 — expose treasury state to agents

- extend `AgentTurnContext` with treasury-specific fields
- banker context should include full custody obligations by owner
- non-banker context should include only the agent’s own position with the banker plus relevant public treasury cues

Implementation notes:

- keep the banker as the only agent with the full obligations view
- give trader and other agents enough information to reason about their own placed capital and accrued return
- do not leak unnecessary private balances between peers

Step 5 — align prompts and mock behavior

- update banker/trader prompt guidance around treasury custody rather than generic capital deployment
- reduce emphasis on roles that are currently out of product scope on the frontend
- update the mock runtime so banker/trader scenarios exercise custody placement and redemption decisions

Implementation notes:

- banker prompt should reason about deployment, custody obligations, and safe redemption limits
- trader prompt should reason about whether to leave funds idle, place them with the banker, or redeem them
- keep structured validation in the backend; prompts should describe options, not enforce them

Step 6 — replay and frontend visibility

- add replay event types or richer replay projections for banker custody placement, accrued return, and redemption
- update the frontend to show only the currently relevant banker/trader treasury information
- keep the operator view simpler than the backend model

Implementation notes:

- first UI slice should show: current banker-held amount per trader, accrued return, and recent custody/redemption events
- defer richer treasury analytics until the mechanic is stable

Step 7 — optional later improvements

- banker spread or fee policy
- lock-up periods or delayed redemption
- bank solvency constraints
- treasury-specific negotiation primitives
- richer prompts for analyst/lawyer/influencer if those roles return to the frontend product surface

Recommended delivery order

1. remove universal accrual and add banker-only accrual rules
2. add explicit banker custody persistence and invariants
3. add treasury-aware replay
4. add treasury-aware agent context and prompt updates
5. add frontend treasury visibility
6. only then consider richer banker economics like spreads or solvency

What “good” looks like after the first better version

- banker is the only interest-bearing intermediary
- traders must deliberately place funds with the banker to earn return
- banker obligations are fully backend-validated
- replay can explain where funds were placed, what accrued, and what was redeemed
- prompts consume treasury state but do not own it

Execution guidance for code quality

Always prefer:

- one small vertical slice at a time
- tests added before or alongside each behavior change
- commit only after `corepack pnpm lint`, `corepack pnpm test`, `corepack pnpm typecheck`, and `corepack pnpm build` all pass
- new persistence work behind ports and mappers, never leaking Prisma types into domain/application code
- explicit invariant checks for money movement, session composition, and action legality

Current architecture assessment

Working well:

- domain logic is still framework-light
- money movement rules are centralized in the ledger and account aggregates
- Prisma is isolated behind a repository port and mapper

Needs improvement next:

- no domain event bus or full round engine yet
- durable history now exists and replay reads are exposed, but the agent layer is still an in-process backend slice rather than a standalone MCP boundary
- no idempotency handling yet
- multi-turn state-mutation integration exists for direct transfer proposals and counter-offers, but not yet for broader negotiation patterns
- Docker runtime exists, but it still uses dev-mode web serving and no container-level automated smoke test
- no prompt factory, generalized negotiation engine, or settlement layer beyond direct transfer proposal resolution yet
- live-provider context is stronger now and good enough for repeated confidence checks, but multi-agent capital state is still only refreshed between turns, not within the turn after each agent acts
- the frontend is still only a scaffold and does not yet expose the backend MVP in a useful operator-facing way

What counts as “real working and testable” now

- a backend flow that can create a session, mutate balances through transfer/deposit/withdraw, and read the resulting persisted state back through HTTP
- real Postgres-backed integration tests that prove those flows end to end through the Nest HTTP boundary
- a backend-only orchestrated agent turn with persisted messages/actions and integration coverage
- at least one multi-turn agent communication integration test that proves stateful interaction, not just a single exchange
- a path that resolves at least one persisted agent proposal into an actual validated state transition
- at least one reusable negotiation pattern beyond a single direct transfer request

Recommended next slice

- build a frontend session dashboard that can:
  - create a game session
  - trigger agent orchestration runs
  - show balances and current session state
  - render replay events, messages, and action history
- use React, Vite, TanStack Query, and Vitest with Testing Library as the default frontend stack
- use `shadcn/ui` for composable primitives if a UI layer is needed; avoid a heavier framework until the product surface is clearer
- add frontend integration tests around the main operator flows before broadening backend agent behavior further
- retain replay fidelity so proposal, response, settlement, and model reasoning remain auditable in the UI

What is still later-stage work

- MCP agent servers
- standalone MCP transport boundaries
- richer orchestrated multi-agent turns
- generalized proposal acceptance and settlement logic
- agent-to-agent negotiation through MCP boundaries

Quality additions to include in later phases

- add agent-to-agent integration tests over the current backend slice first, then retain them when MCP agent boundaries are introduced
- add a Docker-first local run mode with the backend, frontend, database, and supporting services orchestrated together for reproducible development and demos

Project concept

Build a system with:

5 agent services, each running as an MCP server
1 bank MCP server, where agents can deposit funds and earn interest, but cannot trade directly from deposits
1 game/orchestrator backend in NestJS that runs rounds, stores state, enforces rules, and records outcomes
1 React frontend for setup, live monitoring, replay, balances, and agent conversations
Postgres + Prisma for persistence
Fake money in the MVP
A payment abstraction layer so some actions can later be gated with x402 on testnet

The core gameplay loop is:

Each agent receives the latest game state.
Each agent thinks and decides on actions.
Agents communicate with one another through MCP-exposed capabilities.
Agents may transfer money, make offers, negotiate, or deposit into the bank.
The bank accrues interest over time.
The orchestrator validates and commits all state transitions.
The frontend renders the round and replay timeline.
Recommended tech stack
Backend
TypeScript
NestJS
Prisma ORM
PostgreSQL
Zod for runtime schema validation of agent responses and MCP payloads
SSE first, with WebSockets optional later
OpenAI or another LLM provider behind an abstraction
Docker Compose for local orchestration

NestJS is a strong fit here because its module/provider model maps well to a layered backend with injectable services, factories, and adapters. Prisma gives you type-safe data access for Postgres and a straightforward migration workflow.

Frontend
React
Vite
TypeScript
TanStack Query
Zustand or simple local state initially
Vitest + Testing Library
shadcn/ui or a light component layer
Infrastructure / tooling
Docker Compose
pnpm
ESLint
Prettier
Husky + lint-staged
Vitest or Jest
Playwright later for end-to-end flows
Agent protocol / interoperability
MCP for the agent boundary
Prefer HTTP-based transport for your project architecture so agents can run as independently deployable services and later align more naturally with x402’s HTTP payment flow. MCP’s docs and roadmap emphasize the protocol and ongoing transport evolution, so keeping your transport isolated behind an adapter is the safe architectural move.
System architecture

Use hexagonal architecture for the backend.

At a high level:

Domain layer
pure business logic
game rules
round resolution
bank interest logic
reputation / trust logic
payment policy abstractions
Application layer
use cases
orchestration services
command handlers
transaction coordination
event publication
Ports
AgentGatewayPort
BankPort
PaymentPort
GameRepositoryPort
LedgerRepositoryPort
EventBusPort
ClockPort
LlmPort
Adapters
Prisma repositories
MCP client/server adapters
LLM provider adapters
x402 payment adapter later
REST/SSE controllers
frontend DTO mappers

This gives you a clean separation between:

simulation logic
agent communication
persistence
LLM provider
future real payment integration
Design patterns to use

1. Hexagonal architecture / ports and adapters

Use this as the main structural pattern.

Why:

agent communication may change
payment method will definitely change
you want fake money now and x402 later
you may swap LLM providers or run mock agents in tests 2. Strategy pattern

Use this for:

agent advantage behavior
round resolution policy
trust scoring
interest calculation
negotiation heuristics
payment mode

Examples:

AgentAdvantageStrategy
InterestStrategy
PaymentStrategy
RoundResolutionStrategy 3. Factory pattern

Use factories for:

creating agent runtime clients by agent type
creating MCP clients/adapters
creating payment providers based on environment
building prompts / context bundles

Examples:

AgentRuntimeFactory
PaymentProviderFactory
PromptContextFactory

NestJS providers and custom providers make factory-driven composition natural.

4. State pattern

Useful for game lifecycle:

setup
active round
settlement
completed
failed / paused

Potential GameStateHandler implementations:

LobbyStateHandler
RoundExecutionStateHandler
SettlementStateHandler
CompletedStateHandler 5. Command pattern

Use commands for game actions:

SendMessageCommand
TransferFundsCommand
DepositFundsCommand
WithdrawFundsCommand
AcceptOfferCommand

This makes validation and audit logging cleaner.

6. Domain events

Emit events such as:

RoundStarted
AgentMessageSent
TransferCompleted
FundsDeposited
InterestAccrued
ContractCreated
PaymentChallengeIssued

This will help replay, analytics, and frontend streaming.

7. Repository pattern

Keep Prisma behind repository interfaces, not directly in domain/application logic.

MCP design for the agents

Treat each agent as a small service with:

its own identity
its own policy / advantage
its own memory summary
its own wallet / treasury view
MCP-exposed tools and resources

A clean split is:

Agent MCP servers

Each agent runs as an MCP server exposing capabilities like:

read_public_game_state
read_private_inbox
send_public_message
send_private_message
propose_transfer
propose_contract
deposit_to_bank
withdraw_from_bank
query_bank_rates
query_reputation
finalize_turn

These should be logical capabilities, but the actual state mutation should still go through the central game backend so you keep consistency and auditability.

So in practice:

agents expose MCP interfaces
orchestrator or peer agents call MCP tools
MCP tool handlers delegate to the central game API / domain service
the game backend remains source of truth

That avoids distributed consistency nightmares.

Bank MCP server

The bank should also be an MCP server, but with very constrained responsibilities:

accept deposit requests
accept withdrawal requests
expose current interest rates
expose deposit account balances
expose deposit maturity / restrictions if you add them later
accrue or report interest

Important rule:

bank balances are non-transferable
money in the bank is not spendable directly in negotiations
agents must withdraw before they can use funds in the game again

This makes the bank a strategic tradeoff:

security + passive gain
reduced liquidity
MCP interaction model

I recommend:

the orchestrator triggers turns
agents communicate through MCP calls during their turn window
all committed actions are validated centrally

So the system is not “free-running autonomous chaos.” It is a turn-based, rule-enforced simulation with MCP boundaries.

Agent advantage ideas

Use distinct mechanical advantages, not just different prompts.

Recommended five:

1. Banker agent
   better forecast of bank interest trends
   lower withdrawal penalty or faster withdrawal window
   stronger treasury optimization
2. Analyst agent
   receives richer summarized game state each round
   sees trust/reputation patterns more clearly
   stronger inference edge
3. Lawyer agent
   can create one enforceable structured contract per round
   backend can automatically settle it if conditions are met
4. Influencer agent
   one boosted public message per round
   public message is surfaced more prominently in the UI and state summary
5. Trader agent
   lower transfer friction / transaction fee
   can make more offers per round

Keep advantages enforced in code, not only in prompts.

Data model direction

Use Prisma + Postgres with roughly these aggregates:

GameSession
GameRound
Agent
AgentBalance
AgentDepositAccount
PublicMessage
PrivateMessage
Offer
Contract
Transfer
Deposit
Withdrawal
InterestAccrual
TurnDecision
TurnExecution
LlmInvocation
DomainEvent
PaymentAttempt
PaymentChallenge

Prisma is well suited to this because you’ll have a strongly relational model with clear audit history.

Recommended folder structure

For the NestJS backend:

apps/
api/
src/
main.ts
app.module.ts

      modules/
        game/
          application/
          domain/
          infrastructure/
          presentation/

        agents/
          application/
          domain/
          infrastructure/
          presentation/

        bank/
          application/
          domain/
          infrastructure/
          presentation/

        payments/
          application/
          domain/
          infrastructure/
          presentation/

        replay/
          application/
          domain/
          infrastructure/
          presentation/

        shared/
          domain/
          application/
          infrastructure/
          presentation/

      prisma/
        schema.prisma
        migrations/

packages/
mcp-contracts/
shared-types/
eslint-config/
tsconfig/

And within each module:

application/
use-cases/
services/
commands/
queries/
dto/

domain/
entities/
value-objects/
services/
events/
policies/
repositories/
errors/

infrastructure/
prisma/
mcp/
llm/
http/
config/
mappers/

presentation/
rest/
sse/
controllers/

This structure scales well for solo development because it stays consistent.

Good coding practices
Core principles
keep domain logic framework-light
prefer pure domain services where possible
validate all external input at runtime
never trust LLM output without schema validation
enforce invariants in one place
make money movement auditable and idempotent
avoid leaking Prisma types across domain boundaries
write code so fake-money and x402-money share the same port
Practical rules
one use case = one primary responsibility
keep DTOs separate from domain models
keep controller methods thin
no business logic in React components
no raw SQL unless you really need it
no direct LLM calls from controllers
no direct bank mutation outside bank use cases
use transactions for settlement-critical flows
prefer deterministic IDs for replayable tests where useful
Validation
use Zod for:
LLM outputs
MCP request/response contracts
API payloads at boundaries
Logging

Log:

game id
round id
agent id
action type
balance deltas
validation failures
LLM latency / token usage
payment challenge / verification results later
Testing

Write:

unit tests for domain services
integration tests for application services with test DB
contract tests for MCP adapters
replay tests for deterministic sessions
simulation smoke tests for multi-round games
Git structure and workflow
Branching

For solo work, keep it simple:

main
short-lived feature branches:
feat/mcp-agent-runtime
feat/bank-server
feat/game-round-engine
feat/react-dashboard
Commit style

Use conventional commits.

Good examples:

feat(game): add round settlement service
feat(bank): implement deposit and interest accrual use cases
feat(agents): add MCP server adapter for agent runtime
feat(payments): introduce PaymentPort and fake payment adapter
refactor(shared): move money logic into value objects
test(game): add replay tests for deterministic rounds
fix(bank): prevent transfers from deposit balances
docs(architecture): add MCP and x402 migration plan
chore(repo): add pnpm workspace and shared tsconfig
Commit discipline

Each commit should ideally:

build
pass tests
move one concern forward
avoid mixing refactor + feature + formatting unless tiny
MVP definition

The MVP should be intentionally narrow.

MVP goal

A playable, replayable simulation where:

5 agents each run as MCP servers
1 bank MCP server exists
the NestJS orchestrator runs 5–10 rounds
agents can send messages, propose transfers, deposit/withdraw, and make decisions
all money is fake
frontend shows balances, messages, and round history
MVP features
create game session
initialize 5 agents with equal starting balances
initialize bank interest rate
execute turn-by-turn game rounds
public messages
private messages
direct transfers
bank deposits and withdrawals
interest accrual once per round
winner calculation
replay UI
persisted audit log
Excluded from MVP
x402 real or testnet payment execution
dynamic contract enforcement beyond very simple deals
autonomous free-running agents outside turns
complex alliance graphs
sophisticated memory systems
multiple chain/network support
