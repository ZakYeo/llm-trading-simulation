a multi-agent negotiation and treasury simulator where each agent is exposed as its own MCP server, communicates through MCP-compatible tools/resources, and operates on fake balances first, with a clean migration path toward x402-based testnet payments later. MCP is an open standard for connecting AI applications to tools, data, and workflows, which makes it a good fit for agent-to-agent interaction boundaries. x402 is designed around HTTP 402 Payment Required challenge/response flows, which makes it a sensible later-stage payment layer for monetized agent actions or paid resource access.

Execution tracker

Current phase: Phase 2 — Backend agent orchestration foundation
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
- a gated live OpenAI integration test now exists for the agents orchestration HTTP path, now running against `gpt-4.1-mini` with incentive-based prompting and per-agent reasoning logs
- live-provider runs now demonstrate real non-passive interaction, but still favor message-level negotiation more often than structured proposal/settlement actions

Readiness assessment:

- close to a real fake-money backend MVP
- already at the first credible backend agent-communication milestone
- strong enough to demo backend-only agent interaction through HTTP, replay, and live-provider smoke coverage
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

Immediate next steps:

- improve action semantics so structured economic actions are easier for the live provider to distinguish from generic messages
- improve context richness so agents see clearer incentives, leverage, and the difference between talking about a deal and actually executing one
- strengthen the gated live OpenAI test so it detects economically substantive interaction without forcing a particular action type
- keep deterministic mock tests as the main regression suite while the live-provider path remains a targeted confidence check
- keep frontend integration deferred until backend communication and replay become richer
- only after that, split the current in-process contract into true MCP-facing agent boundaries

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
- live-provider context is still too weak about when a structured action is economically better than another round of messaging

What counts as “real working and testable” now

- a backend flow that can create a session, mutate balances through transfer/deposit/withdraw, and read the resulting persisted state back through HTTP
- real Postgres-backed integration tests that prove those flows end to end through the Nest HTTP boundary
- a backend-only orchestrated agent turn with persisted messages/actions and integration coverage
- at least one multi-turn agent communication integration test that proves stateful interaction, not just a single exchange
- a path that resolves at least one persisted agent proposal into an actual validated state transition
- at least one reusable negotiation pattern beyond a single direct transfer request

Recommended next slice

- clarify action semantics in the live-provider prompt/context so `send_private_message` is treated as conversation and proposal actions are treated as executable economic moves
- enrich the agent turn context with compact economic cues, such as why capital deployment or accepted proposals change expected outcome
- raise the live-provider test bar from "not all finalize" toward "economically substantive interaction happened" without requiring one exact action type
- keep agent-to-agent integration coverage for both accepted and rejected proposals as the deterministic baseline for future negotiation primitives
- retain replay fidelity so proposal, response, settlement, and model reasoning remain auditable

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
