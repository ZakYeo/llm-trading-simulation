# llm-trading-simulation

Multi-agent negotiation and treasury simulator built around MCP service boundaries,
a NestJS orchestration backend, and a React monitoring frontend.

## Workspace

- `apps/api`: NestJS orchestrator and HTTP API
- `apps/web`: React/Vite dashboard
- `packages/mcp-contracts`: shared Zod contracts for MCP interaction
- `packages/shared-types`: shared TypeScript domain-facing types
- `packages/eslint-config`: shared ESLint entrypoint

## Planned phases

The project roadmap lives in [plan.md](./plan.md) and [steps.md](./steps.md).
Phase 0 scaffolds the monorepo, API, frontend, persistence config, and repo tooling.

## Local development

1. Ensure `pnpm` is available.
2. Copy `.env.example` to `.env`.
3. Start Postgres with `docker compose up -d`.
4. Install dependencies with `pnpm install`.
5. Run the API and frontend with `pnpm dev`.
