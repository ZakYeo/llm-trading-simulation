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
  'gpt-5-mini';
const runLiveOpenAiTests =
  process.env.ENABLE_OPENAI_LIVE_TESTS === '1' &&
  Boolean(testDatabaseUrl) &&
  Boolean(liveOpenAiApiKey);

describe.runIf(runLiveOpenAiTests)('Agents live OpenAI integration', () => {
  let prismaService: PrismaService;
  let baseUrl: string;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.OPENAI_API_KEY = liveOpenAiApiKey;
    process.env.OPENAI_MODEL = liveOpenAiModel;
    process.env.OPENAI_AGENT_SYSTEM_PROMPT =
      'You are a simulated trading-game agent. Choose exactly one next action. In turns 1 and 2, prefer sending one concise public/private message or making a transfer proposal rather than finalizing immediately. Only send private messages or proposals to valid peer ids. Use positive fake-money amounts only. If a valid proposal is pending for you, prefer responding to it with acceptance or rejection instead of finalizing.';
    delete process.env.AGENT_RUNTIME_PROVIDER;

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
  });

  it('runs a real OpenAI-backed multi-turn agent round through the HTTP boundary', async () => {
    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Live OpenAI Table',
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
    const createdSession = (await createResponse.json()) as { id: string };

    const response = await fetch(
      `${baseUrl}/api/agents/sessions/${createdSession.id}/rounds/orchestrate`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          turnCount: 2,
        }),
      },
    );
    const body = (await response.json()) as {
      gameSessionId: string;
      turns: Array<{
        turnNumber: number;
        actions: Array<{ action: { type: string } }>;
        actionRecords: Array<{ actionType: string }>;
        messages: Array<{ visibility: string; content: string }>;
      }>;
    };
    const replayResponse = await fetch(
      `${baseUrl}/api/replay/sessions/${createdSession.id}`,
    );
    const replay = (await replayResponse.json()) as {
      events: Array<{ type: string; actionType?: string }>;
    };

    expect(response.status, JSON.stringify(body)).toBe(201);
    expect(body.gameSessionId).toBe(createdSession.id);
    expect(body.turns).toHaveLength(2);
    expect(body.turns.every((turn) => turn.actions.length === 5)).toBe(true);
    expect(body.turns.every((turn) => turn.actionRecords.length === 5)).toBe(
      true,
    );
    expect(replayResponse.status).toBe(200);
    expect(replay.events.some((event) => event.type === 'action')).toBe(true);
  }, 120_000);
});
