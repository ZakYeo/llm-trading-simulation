# llm-trading-simulation

Multi-agent negotiation and treasury simulator built around MCP service boundaries,
a NestJS orchestration backend, and a React monitoring frontend.

## Current status

Phase 0 is complete. Phase 1 is in progress.

Implemented today:

- pnpm workspace with shared packages, linting, formatting, and tests
- NestJS API scaffold and React/Vite frontend scaffold
- Prisma schema for sessions, agents, balances, deposit accounts, transfers, deposits, and withdrawals
- core money, balance, deposit-account, and ledger domain primitives
- game session creation, bank deposit/withdrawal, and direct transfer use cases
- Prisma mapper/repository adapter tests for session persistence boundaries

Current backend quality notes:

- domain and application logic are covered by unit tests
- repository persistence is only validated with fake Prisma delegates so far
- NestJS dependency wiring, HTTP mutation endpoints, and real Postgres integration tests are not implemented yet

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

1. Copy `.env.example` to `.env`.
2. Start Postgres with `docker compose up -d`.
3. Install dependencies with `corepack pnpm install`.
4. Run the API and frontend with `corepack pnpm dev`.

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
3. `corepack pnpm typecheck`
4. `corepack pnpm build`

## Immediate next work

1. Add NestJS providers for Prisma and repository wiring.
2. Add real integration tests against Prisma/Postgres instead of only fake delegates.
3. Add round and interest-accrual application flows.
4. Add validated REST/SSE entry points on top of the current use cases.
