# llm-trading-simulation

Multi-agent negotiation and treasury simulator built around MCP service boundaries,
a NestJS orchestration backend, and a React monitoring frontend.

## Current status

Phase 0 and the core Phase 1 backend ledger work are complete. The repo is now in the first backend agent-orchestration phase.

Reality check:

- the project is close to a real fake-money backend MVP
- it is now entering the first real backend agent-communication slice
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
- transfer proposal acceptance and rejection actions, with accepted proposals resolved through the existing transfer flow
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
- accepted transfer proposals now result in real persisted balance mutations, not just replay-only intents
- rejected transfer proposals are now covered too and leave balances unchanged while remaining replay-visible
- the OpenAI key is now usable through the backend agent gateway when `AGENT_RUNTIME_PROVIDER` is not set to `mock`
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

## Database bootstrap

Primary database:

1. `corepack pnpm db:generate`
2. `corepack pnpm db:migrate:deploy`

Test database:

1. Ensure Docker Postgres is running
2. `TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llm_trading_simulation_test?schema=public" corepack pnpm db:test:prepare`
3. `TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llm_trading_simulation_test?schema=public" corepack pnpm --filter @llm-sim/api test:integration`

Integration tests currently run with file parallelism disabled because they share a single Postgres test database.

## Docker

Run the full stack in isolation with:

1. `corepack pnpm docker:up`
2. Open the frontend at `http://localhost:5173`
3. The API is exposed at `http://localhost:3000/api`

This path builds the API and web containers and runs Postgres inside Compose.

## Verification

Run these before committing:

1. `corepack pnpm lint`
2. `corepack pnpm test`
3. `corepack pnpm test:integration`
4. `corepack pnpm typecheck`
5. `corepack pnpm build`

## Immediate next work

1. Resolve persisted agent proposals into validated game-state mutations instead of leaving them as replay-only intents.
2. Extend the action vocabulary beyond direct transfer proposals into richer negotiation primitives.
3. Decide whether proposal settlement should stay in the current orchestrator or move into a dedicated settlement service.
4. Keep frontend integration deferred until backend agent communication and replay are richer.
5. Introduce standalone MCP-facing agent adapters after the backend communication loop is stable.
