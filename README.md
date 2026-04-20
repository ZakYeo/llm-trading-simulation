# llm-trading-simulation

A pnpm workspace for a backend-driven multi-agent trading simulation.

The current codebase consists of:



- `apps/api`: a NestJS API for session state, agent orchestration, replay reads, and SSE session events
- `apps/web`: a React + Vite operator UI for creating sessions, running turns, advancing rounds, and inspecting state
- `packages/shared-types`: shared transport DTOs and enums used across API and web
- `packages/mcp-contracts`: Zod schemas and contract types for agent-facing actions and turn context

The active simulation loop is centered on a banker and trader. Agents negotiate, propose or accept transfers, place funds into banker custody, open market positions, and persist each state change for replay and audit.

## Features

- Create and reconnect to saved sessions from the operator UI
- Configure a banker and trader with editable personality sliders at session startup
- Run orchestrated communication turns through mock or OpenAI-backed runtimes
- Stream live session activity over SSE while agent turns are running
- Track balances, banker custody positions, accrued interest, and market exposure
- Advance rounds explicitly to apply custody interest and settle eligible market positions
- Apply percentage-based entry fees and deterministic adverse slippage when traders open market positions
- Persist replay history for transfers, messages, actions, custody events, market listings, and settlements
- Run unit, integration, and Playwright coverage from the workspace root

## Screenshots
<img width="2559" height="1354" alt="image" src="https://github.com/user-attachments/assets/4e24ddfb-7142-4339-91c7-b3ece0b31c9d" />
<img width="490" height="753" alt="image" src="https://github.com/user-attachments/assets/e2abba1e-e439-4365-a7b8-b9979aae85b0" />
<img width="2559" height="1352" alt="image" src="https://github.com/user-attachments/assets/7467725a-15ae-4854-a041-86aecafbe16a" />
<img width="2555" height="1346" alt="image" src="https://github.com/user-attachments/assets/d143cffa-0807-4d0f-81a2-ac03bea5e00c" />
<img width="903" height="913" alt="image" src="https://github.com/user-attachments/assets/a9fd73fb-6249-4889-a857-27aa2ffa213e" />


## Tech Stack

- Backend: NestJS, TypeScript, Prisma, PostgreSQL
- Frontend: React 19, Vite, TanStack Query, Zustand
- Shared contracts: TypeScript, Zod
- Tooling: pnpm workspace, Vitest, Playwright, ESLint, Prettier, Husky

## Repository Structure

```text
.
├── apps
│   ├── api
│   │   ├── prisma
│   │   └── src
│   │       ├── modules
│   │       │   ├── agents
│   │       │   ├── bank
│   │       │   ├── game
│   │       │   ├── replay
│   │       │   └── shared
│   └── web
│       ├── e2e
│       └── src
├── packages
│   ├── eslint-config
│   ├── mcp-contracts
│   ├── shared-types
│   └── tsconfig
├── scripts
├── docker-compose.yml
├── plan.md
└── steps.md
```

## Architecture

### Backend

The API is served under `/api` and is organized into modules:

- `game`: session lifecycle, balances, transfers, custody placement and redemption, market position opening, and round advancement
- `agents`: communication turns, orchestrated rounds, agent runtime adapters, and per-session SSE event streaming
- `bank`: bank-domain entities used by treasury and deposit flows
- `replay`: replay-oriented reads over persisted rounds and events
- `shared`: Prisma integration, tokens, filters, and cross-cutting utilities

Current HTTP surface, at a high level:

- `/api/game/health`
- `/api/game/sessions`
- `/api/game/sessions/:id/deposit`
- `/api/game/sessions/:id/withdraw`
- `/api/game/sessions/:id/transfer`
- `/api/game/sessions/:id/custody/place`
- `/api/game/sessions/:id/custody/redeem`
- `/api/game/sessions/:id/market/open`
- `/api/game/sessions/:id/rounds/advance`
- `/api/agents/sessions/:id/turns/communicate`
- `/api/agents/sessions/:id/rounds/orchestrate`
- `/api/agents/sessions/:id/events`
- `/api/replay/health`
- `/api/replay/sessions/:id`

### Frontend

`apps/web` is the only supported frontend. The web app is an operator dashboard
that currently supports:

- creating a new session with a configurable banker and trader
- reconnecting to existing sessions
- running the next 1-10 orchestrated turns
- advancing the current round with an optional custody interest rate
- inspecting balances, custody totals, market opportunities, open positions, and replay history
- watching live streamed activity while turns are in progress

The frontend is organized with a feature-first MVVM structure:

- `View`: React components and page composition, primarily the dashboard shell and presentational cards
- `ViewModel`: hooks that coordinate React Query, SSE event handling, mutation side effects, and UI commands
- `Model`: frontend-only typed mappers and helpers that derive display state from shared contracts and API payloads

Current frontend feature areas under `apps/web/src/features` are centered on:

- `operator-dashboard`: page composition and top-level orchestration
- `session-setup`: create/connect flow and agent draft state
- `audit-trail`: replay and live event stream shaping
- `session-overview`: balances, treasury, and market display models

This structure is intended as an internal refactor only. The dashboard visuals,
routes, and operator behavior should remain unchanged unless explicitly called
out elsewhere.

## Session Model

The persisted session state is the source of truth for both replay and agent context.

Important behaviors in the current codebase:

- communication turns do not advance the round by themselves
- round advancement is explicit and applies custody interest
- market positions remain visible until their settlement round is reached
- opening a market position charges an immediate percentage-based entry fee
- opening a market position also applies deterministic adverse slippage based on trade risk, signal quality, and size
- slippage worsens the position's effective settlement return bps rather than changing principal
- agent turn context is built from current balances, custody totals, recent actions, recent messages, visible market opportunities, and open positions
- replay data includes operational events such as custody placements, custody redemptions, market openings, market settlements, and message/action history
- market-open replay entries include principal, entry fee, and slippage details so the audit trail shows why a trade underperformed the headline opportunity

## Environment

Copy the example file first:

```bash
cp .env.example .env
```

Main variables:

- `DATABASE_URL`: primary Postgres connection string
- `TEST_DATABASE_URL`: Postgres connection string used by integration tests
- `PORT`: API port, default `3000`
- `VITE_API_BASE_URL`: frontend API base URL, usually `http://localhost:3000/api`
- `AGENT_RUNTIME_PROVIDER`: `openai` or `mock`
- `OPENAI_API_KEY`: required for live OpenAI-backed agent runs
- `OPENAI_MODEL`: backend model name, default `gpt-5.2`
- `OPENAI_AGENT_SYSTEM_PROMPT`: optional prompt override
- `OPENAI_AGENT_STRICT_MODE`: optional stricter output handling flag

## Prerequisites

- Node.js 20+ or 22+
- Corepack enabled
- Docker and Docker Compose for local Postgres and containerized runs

Enable pnpm through Corepack:

```bash
corepack enable
corepack prepare pnpm@9.12.3 --activate
```

## Getting Started

1. Install dependencies.

```bash
corepack pnpm install
```

2. Start Postgres.

```bash
docker compose up -d postgres
```

3. Generate the Prisma client.

```bash
corepack pnpm db:generate
```

4. Apply migrations.

```bash
corepack pnpm db:migrate:deploy
```

5. Start the API and web app together.

```bash
corepack pnpm dev
```

Local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api`

Backend-only development:

```bash
corepack pnpm --filter @llm-sim/api dev
```

Frontend-only development:

```bash
corepack pnpm --filter @llm-sim/web dev
```

## Docker

Start the full stack:

```bash
corepack pnpm docker:up
```

Stop it:

```bash
corepack pnpm docker:down
```

Services:

- Postgres: `localhost:5432`
- API: `http://localhost:3000/api`
- Web: `http://localhost:5173`

The Docker setup runs the API and frontend in watch mode with bind mounts, so code changes under `apps/` and `packages/` are picked up without rebuilding the whole image. If you change dependency manifests or Dockerfiles, restart the stack.

## Database Workflow

Generate Prisma client:

```bash
corepack pnpm db:generate
```

Create or apply development migrations:

```bash
corepack pnpm db:migrate
```

Apply committed migrations without prompts:

```bash
corepack pnpm db:migrate:deploy
```

Prepare the integration test database:

```bash
corepack pnpm db:test:prepare
```

If `TEST_DATABASE_URL` is not set, the helper script falls back to the conventional local test database:

```text
postgresql://postgres:postgres@localhost:5432/llm_trading_simulation_test?schema=public
```

## Testing

Run workspace unit tests:

```bash
corepack pnpm test
```

Run typechecks:

```bash
corepack pnpm typecheck
```

Run builds:

```bash
corepack pnpm build
```

Run integration tests:

```bash
corepack pnpm test:integration
```

`test:integration` prepares the test database first and then runs package integration suites.

Run the gated live OpenAI integration suite:

```bash
corepack pnpm test:integration:openai
```

This uses a separate default test database name and requires `OPENAI_API_KEY`.

Run the full Playwright suite:

```bash
corepack pnpm test:e2e
```

Run the deterministic frontend-state suite:

```bash
corepack pnpm test:e2e:deterministic
```

This keeps the real browser and frontend runtime, but mocks API responses at the Playwright layer for stable UI assertions.

Run the thinner real-stack smoke suite:

```bash
corepack pnpm test:e2e:ui-smoke
```

Use `test:e2e:ui-smoke` when you want to verify that the real Docker/Postgres-backed stack still boots and wires together correctly.

## Useful Commands

- `corepack pnpm dev`
- `corepack pnpm build`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm test:all`
- `corepack pnpm test:integration`
- `corepack pnpm test:integration:openai`
- `corepack pnpm test:e2e`
- `corepack pnpm test:e2e:deterministic`
- `corepack pnpm test:e2e:ui-smoke`
- `corepack pnpm db:generate`
- `corepack pnpm db:migrate`
- `corepack pnpm db:migrate:deploy`
- `corepack pnpm db:test:prepare`
- `corepack pnpm docker:up`
- `corepack pnpm docker:down`

## Notes

- The active workspace packages are `apps/api`, `apps/web`, `packages/shared-types`, and `packages/mcp-contracts`, alongside shared tooling packages.
- `plan.md` and `steps.md` track planning and milestone notes; they are not the source of truth for the current implementation.
