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

## Screenshots / Video

<img width="2559" height="1352" alt="image" src="https://github.com/user-attachments/assets/7467725a-15ae-4854-a041-86aecafbe16a" />

<img width="2555" height="1346" alt="image" src="https://github.com/user-attachments/assets/d143cffa-0807-4d0f-81a2-ac03bea5e00c" />

https://github.com/user-attachments/assets/e515974d-3bf2-4b75-a04b-9adff2447598

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

## Using the redesigned workspace

The dashboard has three linked views. **Conversation** follows the current round's conversation and actions, with account balances, custody totals, and the next settlements alongside it. Choose **All rounds** in the conversation to read earlier activity. **Finances** contains the full account, custody, opportunity, and position ledger; open Details or Full terms to inspect an item. **History** keeps the complete audit trail and its category, event-count, and round-window filters independently of the journal.

Each view has a direct URL (`#/sessions/:id/conversation`, `finances`, or `history`) and supports reloads and browser Back/Forward. Run controls remain available in every view; on narrow screens they sit in a collapsible region below the content. Turns do not advance the round. **Advance round settlement** applies custody interest and eligible market settlements; the settlement card contains the editable interest rate in basis points. This rate is used on advancement, not included in session creation.

The Appearance menu supports Light, Dark, and System. The Session menu contains saved-session switching, the session ID, and change/new-session actions. Explicit choices persist in this browser. Layouts adapt from narrow portrait screens to wide desktops, and detail drawers become full-width dialogs on small screens. Dialogs and header disclosures support Escape and return keyboard focus to the opening control. Initial requests show skeleton loading; background refreshes retain current content. Brief reveal and typing animations respect reduced-motion preferences.

### Round summaries and conversation playback

The **AI summary this round** card replaces the round note. After each successful **Run next N turns** operation, the backend summarizes the current round's persisted replay and saves the result by session and round. It refreshes after subsequent runs and survives reloads. Advancing starts a new round with an empty summary until turns run in that round.

Summaries use the existing runtime configuration: OpenAI with `OPENAI_API_KEY` and `OPENAI_MODEL`, or a clearly labelled deterministic summary in mock mode. The model receives recorded events as untrusted data, has no tools, and is instructed to distinguish agent claims from recorded transactions. Large rounds use the latest 200 events, with coverage displayed below the summary. Generation has a 30-second timeout; a failed summary does not fail or repeat completed simulation actions. Replay remains the source of truth.

The summary storage requires the additive migration included with this change. Run `corepack pnpm db:generate` and `corepack pnpm db:migrate:deploy` when updating an existing checkout. Summaries are available through `GET /api/agents/sessions/:id/rounds/:roundNumber/summary`, returning `{ summary: record | null }`.

The conversation has a bounded scrollable window. Saved history is immediately available; newly appended activity appears at 180 ms intervals with a short reveal animation. It follows the latest activity while you are at the bottom and preserves your reading position when you scroll up. **Jump to latest activity** resumes following. Reduced-motion mode disables pacing and animation. Personality panels expand and collapse smoothly without stretching adjacent agent cards.

### Frontend MVVM boundaries

React and strict TypeScript remain the frontend stack. Feature `model` folders contain pure typed data transformations; `view-model` folders own application state, requests, subscriptions, and commands; `view` folders and feature components render that data and bind commands. Shared UI under `shared/ui` owns only reusable presentation and accessibility behavior. HTTP/SSE transport stays in `lib/api.ts`; models consume shared transport types directly rather than importing the transport implementation.

`corepack pnpm --filter @llm-sim/web lint` enforces these dependency directions and runs positive/negative architecture fixtures. Model imports of views, view-models, React, and transport are rejected; views cannot import transport or query/store libraries; shared UI cannot import features. Dynamic and CommonJS imports are rejected inside these layers to prevent boundary bypasses. Feature-specific components in `src/components` are treated as views.

Browser validation uses `corepack pnpm test:e2e:deterministic` for mocked API scenarios without Docker and `corepack pnpm test:e2e:ui-smoke` for the real mock-runtime/Postgres stack. Responsive scenarios cover both themes at seven portrait, landscape, tablet, desktop, and ultrawide sizes, live resizing, reduced motion, and 200% CSS zoom. Screenshots are written to the ignored `tmp/ui-redesign` directory.

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
