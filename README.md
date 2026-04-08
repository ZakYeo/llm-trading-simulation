# llm-trading-simulation

A backend-first multi-agent trading and treasury simulation platform.

The project combines:

- a NestJS API for orchestration and game state management
- a React/Vite frontend for operating sessions and inspecting replay data
- Prisma/Postgres persistence for sessions, balances, rounds, messages, and actions
- OpenAI-backed and mock agent runtimes for negotiation behavior

The current MVP focus is fake-money agent interaction: agents communicate, propose transfers, accept or reject proposals, and mutate persisted session state.

## Features

- Create and inspect game sessions
- Track agent balances, deposits, withdrawals, and transfers
- Advance rounds and accrue interest
- Run backend-driven multi-agent communication turns
- Persist agent messages and action history
- Replay session events through a replay-oriented API
- Switch between deterministic mock agents and a real OpenAI-backed runtime
- Run locally or in Docker

## Tech Stack

- Backend: NestJS, TypeScript
- Frontend: React, Vite, TanStack Query, Vitest
- Database: PostgreSQL, Prisma ORM 7
- Tooling: pnpm workspace, ESLint, Prettier, Husky

## Repository Structure

```text
.
├── apps
│   ├── api                  # NestJS backend
│   │   ├── prisma           # Prisma schema and migrations
│   │   └── src
│   │       ├── modules
│   │       │   ├── agents   # Agent orchestration and runtime adapters
│   │       │   ├── game     # Sessions, balances, transfers, rounds
│   │       │   ├── replay   # Replay read model and API
│   │       │   └── shared   # Shared infrastructure and domain utilities
│   └── web                  # React frontend
│       └── src
│           ├── lib          # Frontend API client
│           └── ...          # Dashboard UI
├── packages
│   ├── eslint-config        # Shared lint config
│   ├── mcp-contracts        # Shared contracts for agent actions/messages
│   └── shared-types         # Shared TypeScript types
├── scripts                  # Project-level helper scripts
├── plan.md                  # Active planning document
└── steps.md                 # Milestone notes
```

## Architecture

### Backend

The API follows a modular structure:

- `game`: core session state, balances, deposits, transfers, rounds
- `agents`: agent communication, action persistence, orchestration, runtime adapters
- `replay`: replay-oriented projections over stored events
- `shared`: Prisma, IDs, filters, value objects, and cross-cutting utilities

The backend currently supports:

- session creation and read APIs
- deposit, withdrawal, and transfer APIs
- round advancement with interest accrual
- agent round orchestration
- replay APIs over persisted history

### Frontend

The frontend is an operator dashboard that currently supports:

- creating sessions
- selecting an active session
- running agent rounds for a chosen number of turns
- inspecting balances and current session state
- viewing replay events

## Environment Configuration

Copy the example env file and adjust values as needed:

```bash
cp .env.example .env
```

Main environment variables:

- `DATABASE_URL`: primary Postgres connection string
- `TEST_DATABASE_URL`: integration-test database connection string
- `PORT`: API port
- `VITE_API_BASE_URL`: frontend API base URL, usually `http://localhost:3000/api`
- `AGENT_RUNTIME_PROVIDER`: `openai` or `mock`
- `OPENAI_API_KEY`: required for live OpenAI-backed agent runs
- `OPENAI_MODEL`: OpenAI model used by the backend agent gateway
- `OPENAI_AGENT_SYSTEM_PROMPT`: optional prompt override
- `OPENAI_AGENT_STRICT_MODE`: optional stricter output handling flag

## Prerequisites

- Node.js 20+ or 22+
- Corepack enabled
- Docker and Docker Compose for containerized runs or local Postgres

Enable pnpm through Corepack:

```bash
corepack enable
corepack prepare pnpm@9.12.3 --activate
```

## Getting Started

### Local Development

1. Install dependencies:

```bash
corepack pnpm install
```

2. Start Postgres:

```bash
docker compose up -d postgres
```

3. Generate the Prisma client:

```bash
corepack pnpm db:generate
```

4. Apply migrations:

```bash
corepack pnpm db:migrate:deploy
```

5. Start the backend and frontend:

```bash
corepack pnpm dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api`

### Run Frontend Only

If the API is already running:

```bash
corepack pnpm --filter @llm-sim/web dev
```

### Run API Only

If Postgres is already running:

```bash
corepack pnpm --filter @llm-sim/api dev
```

## Docker

Run the full stack:

```bash
corepack pnpm docker:up
```

Stop it:

```bash
corepack pnpm docker:down
```

Docker services:

- frontend: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Postgres: `localhost:5432`

The API container reads OpenAI and runtime settings from `.env`.
The Docker API and frontend services now run in watch mode with bind-mounted source directories, so local code edits refresh the live containers without a full rebuild.

Typical Docker dev loop:

1. Start the stack with `corepack pnpm docker:up`
2. Edit files under `apps/` or `packages/`
3. Let the running containers hot reload automatically

If you change dependency manifests or Dockerfiles, restart the stack:

```bash
corepack pnpm docker:down
corepack pnpm docker:up
```

## Database Workflow

Generate Prisma client:

```bash
corepack pnpm db:generate
```

Run migrations in development:

```bash
corepack pnpm db:migrate
```

Deploy migrations:

```bash
corepack pnpm db:migrate:deploy
```

Prepare the test database:

```bash
corepack pnpm db:test:prepare
```

By default this prepares:

```text
postgresql://postgres:postgres@localhost:5432/llm_trading_simulation_test?schema=public
```

If `TEST_DATABASE_URL` is present in `.env` or your shell, that value is used instead.

## Testing

Run all unit tests:

```bash
corepack pnpm test
```

Run all unit and integration tests:

```bash
corepack pnpm test:all
```

Run integration tests:

```bash
corepack pnpm test:integration
```

`test:integration` automatically prepares the test database first. It loads `.env` when present and defaults `TEST_DATABASE_URL` to the conventional local test database shown above.

Run linting:

```bash
corepack pnpm lint
```

Run typechecks:

```bash
corepack pnpm typecheck
```

Run builds:

```bash
corepack pnpm build
```

### Live OpenAI Integration Test

The live OpenAI integration test is gated and not part of the default deterministic suite.

Convenience command:

```bash
corepack pnpm test:integration:openai
```

Equivalent explicit example:

```bash
ENABLE_OPENAI_LIVE_TESTS=1 \
OPENAI_LIVE_TEST_RUN_COUNT=2 \
OPENAI_LIVE_TEST_TURN_COUNT=2 \
OPENAI_MODEL="gpt-4.1-mini" \
corepack pnpm test:integration
```

This test uses the real OpenAI API and requires `OPENAI_API_KEY` to be present in `.env` or your shell environment. The integration runner also loads `.env` automatically and prepares the test database before running.

## Useful Scripts

- `corepack pnpm dev`: run API and frontend together
- `corepack pnpm docker:up`: build and run the full Docker stack
- `corepack pnpm docker:down`: stop the Docker stack
- `corepack pnpm db:generate`: generate Prisma client
- `corepack pnpm db:migrate`: create/apply development migrations
- `corepack pnpm db:migrate:deploy`: apply migrations without prompts
- `corepack pnpm db:test:prepare`: reset and prepare the test database
- `corepack pnpm test:all`: run unit tests, then integration tests
- `corepack pnpm test:integration`: prepare the test database and run integration tests
- `corepack pnpm test:integration:openai`: run integration tests with the live OpenAI suite enabled

## Current Scope

The current MVP scope is backend-driven agent interaction with a lightweight frontend operator surface.

Implemented behavior includes:

- fake-money session lifecycle
- transfer, deposit, and withdrawal flows
- round advancement and interest accrual
- persisted agent messaging and actions
- proposal, counter-proposal, acceptance, and rejection flows for direct transfers
- replay-oriented read models
- mock and OpenAI-backed agent runtime support

## Roadmap

See [plan.md](./plan.md) for active priorities and [steps.md](./steps.md) for milestone notes.
