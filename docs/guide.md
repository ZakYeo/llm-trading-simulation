# Setup and usage

[← README](../README.md)

## Run with Docker

```sh
cp .env.example .env
docker compose up --build
```

- Dashboard: <http://localhost:5173>
- API: <http://localhost:3000/api>
- PostgreSQL: `localhost:5432`
- An empty `OPENAI_API_KEY` selects the deterministic mock runtime.
- Stop the stack with `docker compose down`; its named volume retains the database.

## Enable OpenAI agents

Set these values in `.env` before starting:

```dotenv
AGENT_RUNTIME_PROVIDER=openai
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-5.2
```

- `OPENAI_MODEL` selects the model for agent decisions and round summaries.
- Set `AGENT_RUNTIME_PROVIDER=mock` to use scripted agents even when a key is present.
- Mock mode saves personality settings, but its scripted actions do not vary with those settings.
- OpenAI mode sends agent context and recorded activity to the configured API. Keep the key in `.env`, which Git ignores.
- After changing Docker environment variables, recreate the API service:

```sh
docker compose up -d --force-recreate api
```

## Try the simulation

### 1. Set up the agents

- Enter a session name and an initial SIM balance per agent; decimal amounts are supported.
- Use the default Banker and Trader, or add/remove agents and edit their names and roles.
- Configure banker **Warmth**, **Sales aggression** and **Risk discipline**.
- Configure trader **Assertiveness**, **Risk appetite** and **Conviction threshold**.
- Create the session. Connected rosters are read-only; use **Session → New session** for a different setup.

### 2. Run communication turns

- Choose 1–10 turns, or use a preset of 1, 2, 4 or 8.
- Select **Run next N turns** and follow the streamed messages and actions.
- New entries appear progressively inside the conversation window.
- Scroll up to read earlier activity without being pulled back down. **Jump to latest activity** resumes following.
- **Current round / All rounds** changes the conversation's scope independently of History filters.

### 3. Inspect the outcome

- **Conversation:** messages, actions, account summaries, upcoming settlements and the round summary.
- **Finances:** available/reserved balances, custody, market opportunities and open/settled positions.
- **History:** recorded events, with All, Treasury, Market, Messages, Actions and Transfers filters.
- Use **Inspect**, **Details** or **Full terms** for the complete record.
- Market decisions and transfers belong to the agents; the operator controls setup and execution pacing.

### 4. Advance the round

- Communication turns stay in the current round.
- **Advance round settlement** applies custody interest and settles eligible market positions.
- The interest input uses **basis points**, defaulting to 250 bps per advancement.
- Positions remain open until their settlement round is reached.
- Entry fees and adverse slippage are recorded when a market position opens; replay shows recorded settlement results.

## Round summaries

- Generated after a successful **Run next N turns** operation, using that round's persisted replay.
- Saved by session and round, refreshed after later runs, and retained across reloads.
- Large rounds use the latest 200 events; the card displays the number of records included.
- Mock summaries are labelled **Mock runtime**.
- A failed summary does not fail or repeat completed simulation actions. The audit trail remains authoritative.
- Advancing starts a new round; its summary stays empty until turns run in that round.

## Appearance and accessibility

- **Appearance:** Light, Dark or System; explicit choices persist in the browser.
- Header disclosures and dialogs support Escape and return focus to their opening controls.
- Reduced-motion preferences disable entry pacing, reveal effects and skeleton shimmer.
- On narrow screens, run and settlement controls sit below the content in a collapsible region.

## Develop without the app containers

Requires **Node.js 22.12+**, **Corepack** and **Docker with Compose** for PostgreSQL.
Run from the repository root in a POSIX shell, including WSL:

```sh
cp .env.example .env
corepack pnpm install
docker compose up -d postgres
set -a
. ./.env
set +a
corepack pnpm db:generate
corepack pnpm db:migrate:deploy
corepack pnpm dev
```

- The workspace pins pnpm through `packageManager` in `package.json`.
- Exporting `.env` makes the same values available to both workspace apps.
- For backend-only work: `corepack pnpm --filter @llm-sim/api dev`.
- For frontend-only work: `corepack pnpm --filter @llm-sim/web dev`.
- Existing databases created with `prisma db push` may need [migration baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining) before `migrate deploy`. Preserve the data rather than resetting it to bypass `P3005`.

## Configuration

| Variable                     | Purpose                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`               | PostgreSQL connection for the API and Prisma commands         |
| `TEST_DATABASE_URL`          | Connection used by integration tests                          |
| `PORT`                       | API port; default `3000`                                      |
| `VITE_API_BASE_URL`          | Browser API URL; default `http://localhost:3000/api`          |
| `AGENT_RUNTIME_PROVIDER`     | `openai` or `mock`; missing API credentials fall back to mock |
| `OPENAI_API_KEY`             | Credentials for OpenAI-backed decisions and summaries         |
| `OPENAI_MODEL`               | Model name; default `gpt-5.2`                                 |
| `OPENAI_AGENT_SYSTEM_PROMPT` | Optional agent system-prompt override                         |
| `OPENAI_AGENT_STRICT_MODE`   | Set to `1` to enable stricter agent-output handling           |

## Development checks

| Command                                 | Checks                                                 |
| --------------------------------------- | ------------------------------------------------------ |
| `corepack pnpm test`                    | Workspace unit tests                                   |
| `corepack pnpm typecheck`               | TypeScript across the workspace                        |
| `corepack pnpm build`                   | Shared packages, API and frontend builds               |
| `corepack pnpm lint`                    | Lint rules, including frontend architecture boundaries |
| `corepack pnpm test:e2e:deterministic`  | Browser flows with mocked HTTP responses               |
| `corepack pnpm test:e2e:ui-smoke`       | Real frontend, mock runtime and PostgreSQL             |
| `corepack pnpm test:integration`        | Database-backed API and persistence tests              |
| `corepack pnpm test:integration:openai` | Gated live OpenAI integration coverage                 |

- Install the browser once with `corepack pnpm test:e2e:install`.
- Integration tests recreate the local test database; keep its name and connection separate from development data.
- The live OpenAI suite needs an API key and uses a separate default test database.
