import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app.factory.js';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

function readEnvValueFromFile(name: string): string | undefined {
  const candidatePaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
  ];

  try {
    for (const candidatePath of candidatePaths) {
      let envFile: string;

      try {
        envFile = readFileSync(candidatePath, 'utf8');
      } catch {
        continue;
      }

      for (const line of envFile.split(/\r?\n/u)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const separatorIndex = trimmed.indexOf('=');

        if (separatorIndex === -1) {
          continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const rawValue = trimmed.slice(separatorIndex + 1).trim();

        if (key !== name) {
          continue;
        }

        return rawValue.replace(/^['"]|['"]$/gu, '');
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

const liveOpenAiApiKey =
  process.env.OPENAI_API_KEY ?? readEnvValueFromFile('OPENAI_API_KEY');
const liveOpenAiModel =
  process.env.OPENAI_MODEL ??
  readEnvValueFromFile('OPENAI_MODEL') ??
  'gpt-4.1-mini';
const runLiveOpenAiTests =
  process.env.ENABLE_OPENAI_LIVE_TESTS === '1' &&
  Boolean(testDatabaseUrl) &&
  Boolean(liveOpenAiApiKey);
const liveRunCount = Number.parseInt(
  process.env.OPENAI_LIVE_TEST_RUN_COUNT ?? '3',
  10,
);
const liveTurnCount = Number.parseInt(
  process.env.OPENAI_LIVE_TEST_TURN_COUNT ?? '2',
  10,
);

interface OrchestratedRunResult {
  sessionId: string;
  body: {
    gameSessionId: string;
    turns: Array<{
      turnNumber: number;
      actions: Array<{
        agentName: string;
        action: { type: string };
      }>;
      actionRecords: Array<{ actionType: string }>;
      messages: Array<{ visibility: string; content: string }>;
    }>;
  };
  replay: {
    events: Array<{ type: string; actionType?: string }>;
  };
}

describe.runIf(runLiveOpenAiTests)('Agents live OpenAI integration', () => {
  let prismaService: PrismaService;
  let baseUrl: string;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.OPENAI_API_KEY = liveOpenAiApiKey;
    process.env.OPENAI_MODEL = liveOpenAiModel;
    process.env.OPENAI_AGENT_SYSTEM_PROMPT =
      'You are participating in a live backend integration test. Your goal is to maximize your own expected fake-money outcome over the session. Communication and negotiation are optional tools, but if they improve expected value you should use them instead of passively finalizing. Across four turns, the table should not end with every action as finalize_turn. Include a short reasoning field explaining the economic logic behind your action.';
    process.env.AGENT_RUNTIME_PROVIDER = 'openai';

    const app = await createApp();
    await app.listen(0, '127.0.0.1');

    prismaService = app.get(PrismaService);
    baseUrl = await app.getUrl();
    closeApp = async () => {
      await app.close();
    };
  }, 120_000);

  beforeEach(async () => {
    await prismaService.gameSession.deleteMany();
  });

  afterAll(async () => {
    await prismaService.gameSession.deleteMany();
    await closeApp?.();
    delete process.env.OPENAI_AGENT_SYSTEM_PROMPT;
    delete process.env.AGENT_RUNTIME_PROVIDER;
  });

  async function runScenario(runIndex: number): Promise<OrchestratedRunResult> {
    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: `Live OpenAI Table ${runIndex + 1}`,
        initialBalance: '100.0000',
        agents: [
          { name: 'Banker Bot', role: 'banker' },
          { name: 'Analyst Bot', role: 'analyst' },
          { name: 'Lawyer Bot', role: 'lawyer' },
          { name: 'Influencer Bot', role: 'influencer' },
          { name: 'Trader Bot', role: 'trader' },
        ],
      }),
    });
    expect(createResponse.status).toBe(201);
    const createdSession = (await createResponse.json()) as { id: string };

    const response = await fetch(
      `${baseUrl}/api/agents/sessions/${createdSession.id}/rounds/orchestrate`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          turnCount: liveTurnCount,
        }),
      },
    );
    const body = (await response.json()) as OrchestratedRunResult['body'];
    expect(response.status, JSON.stringify(body)).toBe(201);

    const replayResponse = await fetch(
      `${baseUrl}/api/replay/sessions/${createdSession.id}`,
    );
    expect(replayResponse.status).toBe(200);
    const replay =
      (await replayResponse.json()) as OrchestratedRunResult['replay'];

    return {
      sessionId: createdSession.id,
      body,
      replay,
    };
  }

  it('builds live confidence over repeated runs without forcing one exact move', async () => {
    const results: OrchestratedRunResult[] = [];

    for (let runIndex = 0; runIndex < liveRunCount; runIndex += 1) {
      results.push(await runScenario(runIndex));
    }

    const runsWithSubstantiveInteraction = results.filter((result) => {
      const flattenedActionTypes = result.body.turns.flatMap((turn) =>
        turn.actionRecords.map((record) => record.actionType),
      );

      return flattenedActionTypes.some(
        (actionType) =>
          actionType === 'send_private_message' ||
          actionType === 'request_payment' ||
          actionType === 'counter_payment_request' ||
          actionType === 'accept_payment_request' ||
          actionType === 'reject_payment_request' ||
          actionType === 'place_funds_with_banker' ||
          actionType === 'redeem_funds_from_banker',
      );
    });

    for (const result of results) {
      const body = result.body;
      const replay = result.replay;
      const flattenedActionTypes = body.turns.flatMap((turn) =>
        turn.actionRecords.map((record) => record.actionType),
      );
      const flattenedActions = body.turns.flatMap((turn) => turn.actions);
      const nonFinalizeActionTypes = flattenedActionTypes.filter(
        (actionType) => actionType !== 'finalize_turn',
      );
      const bankerOrTraderNonFinalizeActions = flattenedActions.filter(
        (entry) =>
          (entry.agentName === 'Banker Bot' ||
            entry.agentName === 'Trader Bot') &&
          entry.action.type !== 'finalize_turn',
      );
      const substantiveInteractionActionTypes = flattenedActionTypes.filter(
        (actionType) =>
          actionType === 'send_private_message' ||
          actionType === 'request_payment' ||
          actionType === 'counter_payment_request' ||
          actionType === 'accept_payment_request' ||
          actionType === 'reject_payment_request' ||
          actionType === 'place_funds_with_banker' ||
          actionType === 'redeem_funds_from_banker',
      );

      expect(body.gameSessionId).toBe(result.sessionId);
      expect(body.turns).toHaveLength(liveTurnCount);
      expect(body.turns.every((turn) => turn.actions.length === 5)).toBe(true);
      expect(body.turns.every((turn) => turn.actionRecords.length === 5)).toBe(
        true,
      );
      expect(
        nonFinalizeActionTypes.length,
        JSON.stringify({ sessionId: result.sessionId, body }),
      ).toBeGreaterThan(0);
      expect(
        bankerOrTraderNonFinalizeActions.length,
        JSON.stringify({ sessionId: result.sessionId, body }),
      ).toBeGreaterThan(0);
      expect(
        substantiveInteractionActionTypes.length,
        JSON.stringify({ sessionId: result.sessionId, body }),
      ).toBeGreaterThan(0);
      expect(replay.events.some((event) => event.type === 'action')).toBe(true);
    }

    expect(
      runsWithSubstantiveInteraction.length,
      JSON.stringify(
        results.map((result) => ({
          sessionId: result.sessionId,
          actionTypes: result.body.turns.flatMap((turn) =>
            turn.actionRecords.map((record) => record.actionType),
          ),
        })),
      ),
    ).toBeGreaterThan(0);
  }, 240_000);
});
