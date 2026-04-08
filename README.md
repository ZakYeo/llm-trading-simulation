# llm-trading-simulation

Multi-agent negotiation and treasury simulator built around MCP service boundaries,
a NestJS orchestration backend, and a React monitoring frontend.

## Current status

Phase 0 is complete. Phase 1 is in progress.

Reality check:

- the project is close to a real fake-money backend MVP
- it is not yet close to the full MCP multi-agent + LLM system
- the OpenAI key can be used later, but there is no LLM provider integration or agent runtime wired yet

Implemented today:

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
- there is no round engine, replay/event stream, MCP runtime, or OpenAI-backed agent behavior yet

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
2. If you want to prepare for later LLM work, add `OPENAI_API_KEY` to `.env`.
3. Start Postgres with `docker compose up -d`.
4. Install dependencies with `corepack pnpm install`.
5. Apply database changes with `corepack pnpm db:migrate:deploy`.
6. Run the API and frontend with `corepack pnpm dev`.

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

1. Add a minimal frontend path that reads live session state from the backend.
2. Add replay/event-stream reads on top of the now-durable round and ledger history.
3. Add agent-to-agent integration tests once orchestration boundaries exist.
4. Add container-level automated smoke tests for the Docker stack.
5. Only after the backend MVP is proven, start wiring LLM and agent runtime layers.
