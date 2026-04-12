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
    delete process.env.AGENT_MOCK_SCENARIO;
    delete process.env.AGENT_RUNTIME_PROVIDER;
  });

  it('returns replay-oriented round, ledger, and agent history for a game session', async () => {
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
    expect(createResponse.status).toBe(201);
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
    const withdrawalResponse = await fetch(
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
    expect(withdrawalResponse.status).toBe(200);
    const advanceRoundResponse = await fetch(
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
    expect(advanceRoundResponse.status).toBe(200);
    const orchestrateResponse = await fetch(
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
    expect(orchestrateResponse.status).toBe(201);

    const replayResponse = await fetch(
      `${baseUrl}/api/replay/sessions/${createdSession.id}`,
    );
    const replay = (await replayResponse.json()) as {
      gameSession: { id: string; currentRound: number; status: string };
      rounds: Array<{ roundNumber: number }>;
      events: Array<{
        type: string;
        amount?: string;
        visibility?: string;
        actionType?: string;
        relatedProposalActionId?: string;
        content?: string;
      }>;
    };

    expect(replayResponse.status).toBe(200);
    expect(replay.gameSession.id).toBe(createdSession.id);
    expect(replay.gameSession.currentRound).toBe(1);
    expect(replay.gameSession.status).toBe('active');
    expect(replay.rounds.map((round) => round.roundNumber)).toEqual([1]);
    const ledgerEvents = replay.events.filter((event) =>
      ['transfer', 'deposit', 'withdrawal'].includes(event.type),
    );
    expect(ledgerEvents).toHaveLength(3);
    expect(ledgerEvents.map((event) => event.type)).toEqual([
      'transfer',
      'deposit',
      'withdrawal',
    ]);
    expect(ledgerEvents.map((event) => event.amount)).toEqual([
      '15',
      '20',
      '5',
    ]);
    expect(replay.events.some((event) => event.type === 'message')).toBe(true);
    expect(
      replay.events.some(
        (event) => event.type === 'custody_placement' && event.amount === '10',
      ),
    ).toBe(true);
    expect(
      replay.events.some(
        (event) =>
          event.type === 'action' &&
          event.actionType === 'place_funds_with_banker' &&
          event.amount === '10',
      ),
    ).toBe(true);
    expect(
      replay.events.some(
        (event) =>
          event.type === 'message' &&
          event.visibility === 'private' &&
          typeof event.content === 'string' &&
          event.content.length > 0,
      ),
    ).toBe(true);
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

  it('returns explicit custody placement, accrual, and redemption events', async () => {
    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Custody Replay Table',
        initialBalance: '100.0000',
        agents: [
          { name: 'Banker Bot', role: 'banker' },
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

    expect(createResponse.status).toBe(201);
    expect(banker).toBeDefined();
    expect(trader).toBeDefined();

    const placeResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}/custody/place`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ownerAgentId: trader!.id,
          bankerAgentId: banker!.id,
          amount: '20.0000',
        }),
      },
    );
    expect(placeResponse.status).toBe(200);

    const advanceResponse = await fetch(
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
    expect(advanceResponse.status).toBe(200);

    const redeemResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}/custody/redeem`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ownerAgentId: trader!.id,
          bankerAgentId: banker!.id,
          amount: '5.0000',
        }),
      },
    );
    expect(redeemResponse.status).toBe(200);

    const replayResponse = await fetch(
      `${baseUrl}/api/replay/sessions/${createdSession.id}`,
    );
    const replay = (await replayResponse.json()) as {
      events: Array<{
        type: string;
        amount?: string;
        ownerAgentId?: string;
        bankerAgentId?: string;
      }>;
    };

    expect(replayResponse.status).toBe(200);
    expect(
      replay.events.filter((event) => event.type === 'custody_placement'),
    ).toMatchObject([
      {
        type: 'custody_placement',
        amount: '20',
        ownerAgentId: trader!.id,
        bankerAgentId: banker!.id,
      },
    ]);
    expect(
      replay.events.filter((event) => event.type === 'custody_accrual'),
    ).toMatchObject([
      {
        type: 'custody_accrual',
        amount: '0.5',
        ownerAgentId: trader!.id,
        bankerAgentId: banker!.id,
      },
    ]);
    expect(
      replay.events.filter((event) => event.type === 'custody_redemption'),
    ).toMatchObject([
      {
        type: 'custody_redemption',
        amount: '5',
        ownerAgentId: trader!.id,
        bankerAgentId: banker!.id,
      },
    ]);
  });

  it('includes rejected proposal actions without an extra transfer event', async () => {
    process.env.AGENT_MOCK_SCENARIO = 'reject_proposal';

    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Rejected Replay Table',
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

    await fetch(
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

    const replayResponse = await fetch(
      `${baseUrl}/api/replay/sessions/${createdSession.id}`,
    );
    const replay = (await replayResponse.json()) as {
      events: Array<{
        type: string;
        actionType?: string;
      }>;
    };

    expect(replayResponse.status).toBe(200);
    expect(
      replay.events.filter((event) => event.type === 'transfer'),
    ).toHaveLength(0);
    expect(
      replay.events.some(
        (event) =>
          event.type === 'action' &&
          event.actionType === 'reject_payment_request',
      ),
    ).toBe(true);

    delete process.env.AGENT_MOCK_SCENARIO;
  });

  it('includes counter-proposals and the settled counter transfer in replay history', async () => {
    process.env.AGENT_MOCK_SCENARIO = 'counter_proposal';

    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Counter Replay Table',
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

    await fetch(
      `${baseUrl}/api/agents/sessions/${createdSession.id}/rounds/orchestrate`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          turnCount: 4,
        }),
      },
    );

    const replayResponse = await fetch(
      `${baseUrl}/api/replay/sessions/${createdSession.id}`,
    );
    const replay = (await replayResponse.json()) as {
      events: Array<{
        type: string;
        actionType?: string;
        amount?: string;
        relatedProposalActionId?: string;
      }>;
    };

    expect(replayResponse.status).toBe(200);
    expect(
      replay.events.some(
        (event) =>
          event.type === 'action' &&
          event.actionType === 'counter_payment_request',
      ),
    ).toBe(true);
    expect(
      replay.events.some(
        (event) =>
          event.type === 'action' &&
          event.actionType === 'accept_payment_request' &&
          typeof event.relatedProposalActionId === 'string',
      ),
    ).toBe(true);
    expect(
      replay.events.some(
        (event) => event.type === 'transfer' && event.amount === '8.5',
      ),
    ).toBe(true);

    delete process.env.AGENT_MOCK_SCENARIO;
  });
});
