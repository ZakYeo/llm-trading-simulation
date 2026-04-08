import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app.factory.js';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(Boolean(testDatabaseUrl))('Replay HTTP integration', () => {
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

  it('returns replay-oriented round and ledger history for a game session', async () => {
    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Replay Table',
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
      agents: Array<{ id: string; role: string }>;
    };
    const banker = createdSession.agents.find(
      (agent) => agent.role === 'banker',
    );
    const trader = createdSession.agents.find(
      (agent) => agent.role === 'trader',
    );

    await fetch(`${baseUrl}/api/game/sessions/${createdSession.id}/transfer`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sourceAgentId: trader!.id,
        destinationAgentId: banker!.id,
        amount: '15.0000',
      }),
    });
    await fetch(`${baseUrl}/api/game/sessions/${createdSession.id}/deposit`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        agentId: banker!.id,
        amount: '20.0000',
      }),
    });
    await fetch(`${baseUrl}/api/game/sessions/${createdSession.id}/withdraw`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        agentId: banker!.id,
        amount: '5.0000',
      }),
    });
    await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}/rounds/advance`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          interestRateBps: 250,
        }),
      },
    );

    const replayResponse = await fetch(
      `${baseUrl}/api/replay/sessions/${createdSession.id}`,
    );
    const replay = (await replayResponse.json()) as {
      gameSession: { id: string; currentRound: number; status: string };
      rounds: Array<{ roundNumber: number }>;
      events: Array<{ type: string; amount: string }>;
    };

    expect(replayResponse.status).toBe(200);
    expect(replay.gameSession.id).toBe(createdSession.id);
    expect(replay.gameSession.currentRound).toBe(1);
    expect(replay.gameSession.status).toBe('active');
    expect(replay.rounds.map((round) => round.roundNumber)).toEqual([1]);
    expect(replay.events.map((event) => event.type)).toEqual([
      'transfer',
      'deposit',
      'withdrawal',
    ]);
    expect(replay.events.map((event) => event.amount)).toEqual([
      '15',
      '20',
      '5',
    ]);
  });

  it('returns 404 when replay data is not found', async () => {
    const response = await fetch(
      `${baseUrl}/api/replay/sessions/missing-session`,
    );
    const body = (await response.json()) as {
      statusCode: number;
      error: string;
      message: string;
    };

    expect(response.status).toBe(404);
    expect(body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Game replay not found.',
    });
  });
});
