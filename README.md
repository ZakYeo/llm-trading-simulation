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
- a gated live OpenAI integration test now exists for the agents HTTP orchestration path and now uses repeated short runs as a confidence check rather than a single long smoke run
- the live OpenAI path now produces real non-passive interaction under incentive-based prompting and logs each agent decision plus short reasoning
- richer economic context and clearer action semantics now help the live provider occasionally convert banker/trader discussion into valid proposal and acceptance actions
- negotiation-state cues now help banker/trader identify when bilateral discussion is mature enough to convert into executable transfer actions
- role-level prompting now keeps banker/trader as the primary bilateral capital negotiators, while analyst/lawyer/influencer lean more heavily toward public signaling
- the live provider is still non-deterministic, but the short repeated-run confidence test now demonstrates structured proposal/acceptance behavior more consistently
- turn context is refreshed from persistence between turns and retains prior messages/actions, but balances are not refreshed mid-turn between agents
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

## Setup

### Prerequisites

1. Install Node.js 20+ or 22+.
2. Enable Corepack and activate pnpm 9.12.3:
   - `corepack enable`
   - `corepack prepare pnpm@9.12.3 --activate`
3. Install Docker and Docker Compose if you want the Postgres or full-stack container flow.

### Environment configuration

1. Copy `.env.example` to `.env`.
2. Keep the default local database values unless you have a different Postgres instance.
3. Set `OPENAI_API_KEY` in `.env` if you want to run the real OpenAI-backed agent runtime.
4. Leave `AGENT_RUNTIME_PROVIDER=openai` for live-provider runs, or switch it to `mock` for deterministic local backend testing.
5. For local frontend development, the web app reads `VITE_API_BASE_URL`. The default local API URL is `http://localhost:3000/api`.

Example local env shape:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llm_trading_simulation?schema=public"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llm_trading_simulation_test?schema=public"
PORT=3000
VITE_API_BASE_URL="http://localhost:3000/api"
AGENT_RUNTIME_PROVIDER="openai"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5.2"
OPENAI_AGENT_SYSTEM_PROMPT=""
OPENAI_AGENT_STRICT_MODE="0"
```

### Local backend and frontend

1. Install dependencies with `corepack pnpm install`.
2. Start Postgres with `docker compose up -d postgres`.
3. Generate the Prisma client:
   - `corepack pnpm db:generate`
4. Apply migrations:
   - `corepack pnpm db:migrate:deploy`
5. Start the API and frontend together:
   - `corepack pnpm dev`

Local app URLs:

- frontend: `http://localhost:5173`
- API: `http://localhost:3000/api`

### Frontend only

If the API is already running and you only want the React app:

1. Ensure `VITE_API_BASE_URL` points at the API base URL, for example `http://localhost:3000/api`.
2. Run:
   - `corepack pnpm --filter @llm-sim/web dev`
3. Open `http://localhost:5173`

### API only

If you only want the Nest backend:

1. Ensure Postgres is running and `.env` is configured.
2. Run:
   - `corepack pnpm --filter @llm-sim/api dev`

For deterministic backend integration tests, use `AGENT_RUNTIME_PROVIDER=mock`.
For local OpenAI-backed runs, keep `AGENT_RUNTIME_PROVIDER=openai` and set `OPENAI_API_KEY`.

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
3. `ENABLE_OPENAI_LIVE_TESTS=1 OPENAI_LIVE_TEST_RUN_COUNT=2 OPENAI_LIVE_TEST_TURN_COUNT=2 OPENAI_MODEL="gpt-4.1-mini" TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llm_trading_simulation_test?schema=public" corepack pnpm --filter @llm-sim/api exec vitest run --config vitest.integration.config.ts src/modules/agents/presentation/rest/agents.openai.integration.spec.ts`

The live test calls the real OpenAI API and is intentionally gated behind `ENABLE_OPENAI_LIVE_TESTS=1` so normal integration runs stay deterministic and do not incur model usage. It now runs several short independent scenarios and verifies that banker/trader participate in substantive interaction on every run, and that at least one run reaches structured economic action such as proposal, counter, acceptance, or rejection. The gateway logs each agent decision and short reasoning for inspection.

## Docker

### Full stack

Run the full stack in isolation with:

1. Ensure `.env` exists and contains any OpenAI configuration you want the API container to use.
2. Start the stack:
   - `corepack pnpm docker:up`
3. Open:
   - frontend: `http://localhost:5173`
   - API: `http://localhost:3000/api`
4. Stop the stack:
   - `corepack pnpm docker:down`

This builds the API and web containers and runs Postgres inside Compose.
The API container receives `OPENAI_API_KEY`, `OPENAI_MODEL`, `AGENT_RUNTIME_PROVIDER`, `OPENAI_AGENT_SYSTEM_PROMPT`, and `OPENAI_AGENT_STRICT_MODE` from `.env`.

### Postgres only

If you want Docker only for the database during local development:

1. `docker compose up -d postgres`
2. Run the API/frontend locally with `corepack pnpm dev`

## Verification

Run these before committing:

1. `corepack pnpm lint`
2. `corepack pnpm test`
3. `corepack pnpm test:integration`
4. `corepack pnpm typecheck`
5. `corepack pnpm build`

## Immediate next work

1. Decide whether the MVP should refresh capital state between agents within a turn, not just between turns.
2. Keep refining prompt/context behavior before adding hard execution constraints, because model behavior is still the main source of over-negotiation.
3. Keep deterministic mock tests as the main regression suite and treat the live provider path as a targeted confidence check.
4. Use model comparisons selectively; stronger models are more agentic but can also be noisier and less aligned to the intended role market.
5. Keep frontend integration deferred until backend communication and replay become richer.
