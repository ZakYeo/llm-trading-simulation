Phase 0 — Foundations
Create pnpm workspace
Create NestJS backend app
Create React frontend app
Add Prisma + Postgres
Add linting, formatting, test setup
Add shared packages for contracts and types

Deliverable:

repo scaffolding and CI-quality local dev setup

Status:

complete
Phase 1 — Domain model and core ledger
Model agents, rounds, balances, deposits, transfers
Implement money value object
Implement ledger service
Implement bank deposit/withdraw rules
Implement interest accrual policy
Persist via Prisma repositories

Deliverable:

backend can create a game and mutate balances correctly

Status:

in progress
Phase 2 — Game engine
Build game session lifecycle
Add round runner
Add turn processor
Add action validation
Add settlement logic
Add domain events and replay records

Deliverable:

deterministic fake-money simulation without LLMs yet
Phase 3 — MCP agent servers
Define shared MCP contracts
Build one generic MCP agent server template
Add role-specific strategy injection
Add bank MCP server
Add orchestrator MCP client adapter
Add MCP contract tests

Deliverable:

orchestrator can call each agent and bank through MCP boundaries
Phase 4 — LLM integration
Add LlmPort
Add provider adapter
Add prompt context factory
Add Zod-validated agent action schema
Add fallback behavior for invalid responses
Add token/latency logging

Deliverable:

real agent decisions driven by an LLM
Phase 5 — React frontend
Create game setup page
Create live round view
Create balances and bank panel
Create event timeline
Create replay screen
Add SSE updates

Deliverable:

usable demo UI
Phase 6 — Hardening
Add replay tests
Add seeded simulation mode
Add failure recovery / retries
Add admin controls
Add richer agent advantages
Add trust/reputation scoring

Deliverable:

solid portfolio project
