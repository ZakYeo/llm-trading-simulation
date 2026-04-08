import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app.factory.js';
import { PrismaService } from '../../../../modules/shared/infrastructure/prisma/prisma.service.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(Boolean(testDatabaseUrl))('Game HTTP integration', () => {
  let prismaService: PrismaService;
  let baseUrl: string;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;

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
  });

  it('creates, reads, transfers, deposits, and withdraws through the HTTP boundary', async () => {
    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'HTTP Integration Table',
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
    const createdSession = (await createResponse.json()) as {
      id: string;
      agents: Array<{
        id: string;
        role: string;
        availableBalance: string;
        depositPrincipal: string;
      }>;
    };

    expect(createResponse.status).toBe(201);
    expect(createdSession.agents).toHaveLength(5);

    const banker = createdSession.agents.find(
      (agent) => agent.role === 'banker',
    );
    const trader = createdSession.agents.find(
      (agent) => agent.role === 'trader',
    );

    expect(banker).toBeDefined();
    expect(trader).toBeDefined();

    const readResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}`,
    );
    const readSession = (await readResponse.json()) as typeof createdSession;

    expect(readResponse.status).toBe(200);
    expect(readSession.id).toBe(createdSession.id);

    const transferResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}/transfer`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sourceAgentId: trader!.id,
          destinationAgentId: banker!.id,
          amount: '15.0000',
        }),
      },
    );

    expect(transferResponse.status).toBe(200);

    const depositResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}/deposit`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          agentId: banker!.id,
          amount: '20.0000',
        }),
      },
    );

    expect(depositResponse.status).toBe(200);

    const withdrawResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}/withdraw`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          agentId: banker!.id,
          amount: '5.0000',
        }),
      },
    );
    const finalSession =
      (await withdrawResponse.json()) as typeof createdSession;

    expect(withdrawResponse.status).toBe(200);

    const finalBanker = finalSession.agents.find(
      (agent) => agent.id === banker!.id,
    );
    const finalTrader = finalSession.agents.find(
      (agent) => agent.id === trader!.id,
    );

    expect(finalBanker?.availableBalance).toBe('100.0000');
    expect(finalBanker?.depositPrincipal).toBe('15.0000');
    expect(finalTrader?.availableBalance).toBe('85.0000');
  });

  it('returns 400 for invalid request payloads', async () => {
    const response = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: '',
        initialBalance: '100.00000',
        agents: [],
      }),
    });
    const body = (await response.json()) as {
      statusCode: number;
      message: string;
      details: Array<{ path: string; message: string }>;
    };

    expect(response.status).toBe(400);
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Request validation failed.');
    expect(body.details.length).toBeGreaterThan(0);
  });

  it('returns 404 when a session is not found', async () => {
    const response = await fetch(
      `${baseUrl}/api/game/sessions/missing-session`,
    );
    const body = (await response.json()) as {
      statusCode: number;
      message: string;
    };

    expect(response.status).toBe(404);
    expect(body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Game session not found.',
    });
  });
});
