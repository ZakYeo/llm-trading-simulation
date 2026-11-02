# Architecture

[← README](../README.md) · [System diagram](../README.md#how-it-works)

## Frontend: feature-first MVVM

- **Views:** React components render data and bind operator commands.
- **View-models:** hooks own queries, mutations, SSE subscriptions, navigation and activity pacing.
- **Models:** pure typed transformations derive display data from shared transport records.
- **Shared UI:** presentation and accessibility behaviour, without feature or transport dependencies.
- **Transport:** `apps/web/src/lib/api.ts` owns HTTP and EventSource access.

ESLint and architecture fixtures enforce these directions. Views cannot import HTTP/query/store implementations; models cannot import React, view-models or transport.

The workspace exposes Conversation, Finances and History through session-specific hash URLs. Reloads and browser Back/Forward retain the selected session and section.

## Backend: layered simulation modules

- **Agents:** turn orchestration, model adapters, context construction, action validation/execution and live events.
- **Game:** session lifecycle, balances, transfers, custody, market positions and settlement rules.
- **Replay:** reads recorded activity for History, conversation reconstruction and round summaries.
- **Bank:** bank-domain behaviour used by treasury flows.
- **Shared infrastructure:** Prisma, application tokens and HTTP error handling.

Each module separates domain rules, application use cases, infrastructure adapters and presentation.

## A communication run

1. The browser requests an orchestrated run of 1–10 turns.
2. The backend builds each agent's context from persisted balances, custody, open positions and recent messages/actions.
3. The configured runtime returns a structured decision. The OpenAI adapter requests model output; the mock adapter returns scripted decisions.
4. Shared Zod contracts and application rules validate the decision before local use cases execute it.
5. PostgreSQL stores messages, actions and financial effects. SSE supplies message previews and progress to the browser.
6. The backend generates and saves the current round's summary, then reports completion. The UI refreshes authoritative session and replay data.

A run does **not** advance the round. Advancement is a separate command that applies interest and eligible market settlement.

## State, streaming and replay

- Persisted session state is the source of truth for execution and agent context.
- Live message previews are reconciled with persisted messages rather than treated as a second ledger.
- Replay includes messages, actions, transfers, custody events, market listings, openings and settlements.
- Financial inspection exposes recorded principal, fees, slippage and settlement results where available.
- Conversation scope and History filters are independent.

## Summaries

- Stored separately from the audit trail, keyed by session and round.
- Generated from up to the latest 200 recorded events, with coverage and runtime provenance displayed.
- OpenAI receives event content as untrusted data and has no tools in the summarization request.
- Generation has a 30-second timeout; failure leaves completed actions intact.
- Conditional persistence prevents an older event snapshot overwriting a newer summary.

## Shared contracts

- `@llm-sim/shared-types` supplies session, replay, event and summary transport types.
- `@llm-sim/mcp-contracts` supplies Zod schemas for agent actions and turn context.
- Model decisions are executed by backend application use cases; the browser does not call the model API or execute financial rules.

## HTTP surface

| Area               | Routes under `/api`                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Sessions           | `GET/POST /game/sessions`, `GET /game/sessions/:id`                                                                     |
| Financial commands | `PATCH /game/sessions/:id/…` with `deposit`, `withdraw`, `transfer`, `custody/place`, `custody/redeem` or `market/open` |
| Round advancement  | `PATCH /game/sessions/:id/rounds/advance`                                                                               |
| Communication      | `POST /agents/sessions/:id/turns/communicate`                                                                           |
| Orchestration      | `POST /agents/sessions/:id/rounds/orchestrate`                                                                          |
| Live events        | `GET /agents/sessions/:id/events` — SSE                                                                                 |
| Replay             | `GET /replay/sessions/:id`                                                                                              |
| Round summary      | `GET /agents/sessions/:id/rounds/:roundNumber/summary` — nullable summary record                                        |

The frontend exposes operator controls for setup, turn execution and advancement. Financial inspection is read-only; agent decisions use backend financial commands.
