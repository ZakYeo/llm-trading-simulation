import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app.factory.js';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(Boolean(testDatabaseUrl))('Agents HTTP integration', () => {
  let prismaService: PrismaService;
  let baseUrl: string;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.AGENT_RUNTIME_PROVIDER = 'mock';

    const app = await createApp();
    await app.listen(0, '127.0.0.1');

    prismaService = app.get(PrismaService);
    baseUrl = await app.getUrl();
    closeApp = async () => {
      await app.close();
    };
  });

  beforeEach(async () => {
    await prismaService.gameSession.deleteMany();
  });

  afterAll(async () => {
    await prismaService.gameSession.deleteMany();
    await closeApp?.();
    delete process.env.AGENT_RUNTIME_PROVIDER;
  });

  it('orchestrates a backend-only agent communication turn and persists messages', async () => {
    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Agent Communication Table',
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
      `${baseUrl}/api/agents/sessions/${createdSession.id}/turns/communicate`,
      {
        method: 'POST',
      },
    );
    const body = (await response.json()) as {
      gameSessionId: string;
      actions: Array<{ action: { type: string } }>;
      actionRecords: Array<{ actionType: string }>;
      messages: Array<{ visibility: string; content: string }>;
    };

    expect(response.status).toBe(201);
    expect(body.gameSessionId).toBe(createdSession.id);
    expect(body.actions.length).toBe(5);
    expect(body.actionRecords.length).toBe(5);
    expect(body.messages.length).toBeGreaterThan(0);
    expect(
      body.messages.some((message) => message.visibility === 'private'),
    ).toBe(true);
  });

  it('orchestrates multiple backend agent turns and persists richer agent outcomes', async () => {
    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Agent Round Table',
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
          turnCount: 3,
        }),
      },
    );
    const body = (await response.json()) as {
      gameSessionId: string;
      turns: Array<{
        turnNumber: number;
        actionRecords: Array<{ actionType: string; amount?: string }>;
      }>;
    };
    const sessionResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}`,
    );
    const session = (await sessionResponse.json()) as {
      agents: Array<{
        role: string;
        availableBalance: string;
      }>;
    };
    const banker = session.agents.find((agent) => agent.role === 'banker');
    const trader = session.agents.find((agent) => agent.role === 'trader');

    expect(response.status).toBe(201);
    expect(body.gameSessionId).toBe(createdSession.id);
    expect(body.turns).toHaveLength(3);
    expect(body.turns.map((turn) => turn.turnNumber)).toEqual([1, 2, 3]);
    expect(
      body.turns.some((turn) =>
        turn.actionRecords.some(
          (action) =>
            action.actionType === 'propose_direct_transfer' &&
            action.amount === '12.5',
        ),
      ),
    ).toBe(true);
    expect(
      body.turns.some((turn) =>
        turn.actionRecords.some(
          (action) => action.actionType === 'accept_direct_transfer_proposal',
        ),
      ),
    ).toBe(true);
    expect(banker?.availableBalance).toBe('87.5000');
    expect(trader?.availableBalance).toBe('112.5000');
  });
});
