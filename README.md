# llm-trading-simulation

Multi-agent negotiation and treasury simulator built around MCP service boundaries,
a NestJS orchestration backend, and a React monitoring frontend.

## Current status

Phase 0 and the core Phase 1 backend ledger work are complete. The repo is now in the backend agent-orchestration phase.

Reality check:

- the project is close to a real fake-money backend MVP
- it already has a real backend agent-communication slice
- it is not yet close to the full MCP multi-agent system with standalone MCP servers

Implemented so far:

- pnpm workspace with shared packages, linting, formatting, and tests
- NestJS API scaffold and React/Vite frontend scaffold
- Prisma schema for sessions, agents, balances, deposit accounts, transfers, deposits, and withdrawals
- initial Prisma migration and Postgres-backed test database bootstrap flow
- core money, balance, deposit-account, and ledger domain primitives
- game session creation, bank deposit/withdrawal, and direct transfer use cases
- game session read, deposit, withdrawal, and transfer REST endpoints with request validation
- round advancement with interest accrual on deposited principal
- durable round-history persistence for advanced sessions
- durable transfer, deposit, and withdrawal history persistence
- replay-oriented read model and HTTP endpoint over stored round and ledger history
- backend-only agent communication endpoint with persisted public/private agent messages
- multi-turn backend round orchestration with persisted agent action records and replay exposure
- transfer proposal acceptance, rejection, and counter-proposal actions, with accepted proposals resolved through the existing transfer flow
- OpenAI-backed agent gateway behind a backend port, with a mock runtime used for integration tests
- shared Nest app bootstrap and HTTP exception mapping for validation and domain errors
- Prisma mapper/repository adapter tests for session persistence boundaries
- real repository integration coverage against Postgres for game-session persistence
- real Postgres-backed integration coverage for create-session -> transfer -> deposit -> withdraw -> read-state
- real Postgres-backed HTTP integration coverage for create, read, transfer, deposit, and withdraw endpoints
- Docker-backed app runtime verified for API, web, and Postgres

Current backend quality notes:

- domain and application logic are covered by unit tests
- game-session repository persistence is validated both with fake delegates and real Postgres-backed integration tests
- NestJS dependency wiring plus validated session-create, session-read, deposit, withdrawal, and transfer endpoints are implemented
- the main game HTTP flows are now covered against the live Nest app and Postgres
- round advancement and interest accrual are covered through unit, use-case integration, and HTTP integration tests
- round advancement now leaves durable `GameRound` history in Postgres
- transfer, deposit, and withdrawal flows now leave durable ledger history rows in Postgres
- replay data can now be read through `GET /api/replay/sessions/:id`
- replay data now includes agent-message history, money-flow history, and persisted agent action records
- backend agent communication now supports both a single turn and a multi-turn round orchestration path
- multi-turn orchestration is covered through unit tests and Postgres-backed HTTP integration tests
- accepted transfer proposals, including accepted counter-proposals, now result in real persisted balance mutations, not just replay-only intents
- rejected transfer proposals are now covered too and leave balances unchanged while remaining replay-visible
- the OpenAI key is now usable through the backend agent gateway when `AGENT_RUNTIME_PROVIDER` is not set to `mock`
- a gated live OpenAI integration test now exists for the agents HTTP orchestration path; it encourages and detects meaningful interaction when it occurs, while remaining a smoke path because provider behavior is still non-deterministic
- the live OpenAI path now produces real non-passive interaction under incentive-based prompting and logs each agent decision plus short reasoning
- richer economic context and clearer action semantics now help the live provider occasionally convert banker/trader discussion into valid proposal and acceptance actions
- role-level prompting now keeps banker/trader as the primary bilateral capital negotiators, while analyst/lawyer/influencer lean more heavily toward public signaling
- the live provider is still non-deterministic, so structured proposal/settlement actions appear sometimes rather than reliably every run
- there is still no standalone MCP server runtime, generalized negotiation engine, or broad settlement workflow beyond direct transfer proposals yet

## Workspace

- `apps/api`: NestJS orchestrator and HTTP API
- `apps/web`: React/Vite dashboard
- `packages/mcp-contracts`: shared Zod contracts for MCP interaction
- `packages/shared-types`: shared TypeScript domain-facing types
- `packages/eslint-config`: shared ESLint entrypoint

## Planned phases

The project roadmap lives in [plan.md](./plan.md) and [steps.md](./steps.md).
`plan.md` is the source of truth for current priorities and quality gates.

## Local development

1. Copy `.env.example` to `.env` and keep the database/runtime values.
2. Add `OPENAI_API_KEY` to `.env` if you want to exercise the real OpenAI-backed agent gateway.
3. Start Postgres with `docker compose up -d`.
4. Install dependencies with `corepack pnpm install`.
5. Apply database changes with `corepack pnpm db:migrate:deploy`.
6. Run the API and frontend with `corepack pnpm dev`.

For deterministic backend integration tests, use `AGENT_RUNTIME_PROVIDER=mock`.
For Dockerized manual runs, the API container now uses the real OpenAI provider by default when `OPENAI_API_KEY` is present in `.env`.

## Database bootstrap

Primary database:

1. `corepack pnpm db:generate`
2. `corepack pnpm db:migrate:deploy`

Test database:

1. Ensure Docker Postgres is running
2. `TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llm_trading_simulation_test?schema=public" corepack pnpm db:test:prepare`
3. `TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llm_trading_simulation_test?schema=public" corepack pnpm --filter @llm-sim/api test:integration`

Integration tests currently run as explicit sequential file invocations because they share a single Postgres test database.

Live OpenAI integration test:

1. Ensure `.env` contains `OPENAI_API_KEY`
2. Ensure Docker Postgres is running
3. `ENABLE_OPENAI_LIVE_TESTS=1 OPENAI_MODEL="gpt-4.1-mini" TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llm_trading_simulation_test?schema=public" corepack pnpm --filter @llm-sim/api exec vitest run --config vitest.integration.config.ts src/modules/agents/presentation/rest/agents.openai.integration.spec.ts`

The live test calls the real OpenAI API and is intentionally gated behind `ENABLE_OPENAI_LIVE_TESTS=1` so normal integration runs stay deterministic and do not incur model usage. It currently verifies that a 4-turn live run does not collapse into all `finalize_turn` actions, that banker/trader participate in substantive interaction, and that the gateway logs each agent decision and short reasoning for inspection.

## Docker

Run the full stack in isolation with:

1. `corepack pnpm docker:up`
2. Open the frontend at `http://localhost:5173`
3. The API is exposed at `http://localhost:3000/api`

This path builds the API and web containers and runs Postgres inside Compose.
The API container receives `OPENAI_API_KEY`, `OPENAI_MODEL`, and `AGENT_RUNTIME_PROVIDER` from `.env`.

## Verification

Run these before committing:

1. `corepack pnpm lint`
2. `corepack pnpm test`
3. `corepack pnpm test:integration`
4. `corepack pnpm typecheck`
5. `corepack pnpm build`

## Immediate next work

1. Improve action semantics so the live provider more naturally chooses structured economic actions when they are the highest-value move.
2. Improve context richness so agents see clearer economic incentives, current leverage, and when banker/trader should move from discussion into executable transfer actions.
3. Strengthen the gated live-provider test further without forcing a specific move, so it detects economically substantive interaction more robustly across runs.
4. Keep deterministic mock tests as the main regression suite and treat the live provider path as a targeted confidence check.
5. Keep frontend integration deferred until backend communication and replay become richer.
