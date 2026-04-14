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
    expect(finalTrader?.availableBalance).toBe('85.0000');
  });

  it('creates sessions with custom agent rosters through the HTTP boundary', async () => {
    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Custom Roster Table',
        initialBalance: '100.0000',
        agents: [
          { name: 'Banker Bot', role: 'banker' },
          { name: 'Lawyer Bot', role: 'lawyer' },
          { name: 'Trader Bot Alpha', role: 'trader' },
          { name: 'Trader Bot Beta', role: 'trader' },
        ],
      }),
    });
    const createdSession = (await createResponse.json()) as {
      agents: Array<{
        name: string;
        role: string;
      }>;
    };

    expect(createResponse.status).toBe(201);
    expect(createdSession.agents).toHaveLength(4);
    expect(createdSession.agents.map((agent) => agent.role)).toEqual([
      'banker',
      'lawyer',
      'trader',
      'trader',
    ]);
  });

  it('lists saved sessions in reverse creation order through the HTTP boundary', async () => {
    const firstCreateResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'First Listed Table',
        initialBalance: '100.0000',
        agents: [
          { name: 'Banker Bot', role: 'banker' },
          { name: 'Trader Bot', role: 'trader' },
        ],
      }),
    });
    const secondCreateResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Second Listed Table',
        initialBalance: '100.0000',
        agents: [
          { name: 'Banker Bot', role: 'banker' },
          { name: 'Trader Bot', role: 'trader' },
        ],
      }),
    });

    expect(firstCreateResponse.status).toBe(201);
    expect(secondCreateResponse.status).toBe(201);

    const listResponse = await fetch(`${baseUrl}/api/game/sessions`);
    const listedSessions = (await listResponse.json()) as Array<{
      id: string;
      name: string;
      status: string;
      currentRound: number;
    }>;

    expect(listResponse.status).toBe(200);
    expect(listedSessions).toHaveLength(2);
    expect(listedSessions.map((session) => session.name)).toEqual([
      'Second Listed Table',
      'First Listed Table',
    ]);
    expect(listedSessions[0]).toMatchObject({
      status: 'setup',
      currentRound: 0,
    });
  });

  it('responds to CORS preflight requests for session creation', async () => {
    const response = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:5173',
    );
    expect(response.headers.get('access-control-allow-methods')).toContain(
      'POST',
    );
  });

  it('places funds with the banker, accrues custody interest, and redeems through the HTTP boundary', async () => {
    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'HTTP Round Table',
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
      currentRound: number;
      status: string;
      agents: Array<{
        id: string;
        role: string;
        availableBalance: string;
      }>;
      bankerCustodyPositions: Array<{
        bankerAgentId: string;
        ownerAgentId: string;
        principal: string;
        accruedInterest: string;
        totalBalance: string;
      }>;
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

    const custodyPlacementResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}/custody/place`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ownerAgentId: trader!.id,
          bankerAgentId: banker!.id,
          amount: '40.0000',
        }),
      },
    );

    expect(custodyPlacementResponse.status).toBe(200);

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

    const advancedSession =
      (await redeemResponse.json()) as typeof createdSession;
    const advancedBanker = advancedSession.agents.find(
      (agent) => agent.id === banker!.id,
    );
    const advancedTrader = advancedSession.agents.find(
      (agent) => agent.id === trader!.id,
    );

    expect(redeemResponse.status).toBe(200);
    expect(advancedSession.status).toBe('active');
    expect(advancedSession.currentRound).toBe(1);
    expect(advancedBanker?.availableBalance).toBe('136.0000');
    expect(advancedTrader?.availableBalance).toBe('65.0000');
    expect(advancedSession.bankerCustodyPositions).toEqual([
      {
        bankerAgentId: banker!.id,
        ownerAgentId: trader!.id,
        principal: '36.0000',
        accruedInterest: '0.0000',
        totalBalance: '36.0000',
      },
    ]);
  });

  it('advances rounds with the backend default interest rate when the request omits an override', async () => {
    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'HTTP Default Interest Table',
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
      }>;
      bankerCustodyPositions: Array<{
        bankerAgentId: string;
        ownerAgentId: string;
        principal: string;
        accruedInterest: string;
        totalBalance: string;
      }>;
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

    const custodyPlacementResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}/custody/place`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ownerAgentId: trader!.id,
          bankerAgentId: banker!.id,
          amount: '40.0000',
        }),
      },
    );

    expect(custodyPlacementResponse.status).toBe(200);

    const advanceResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}/rounds/advance`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );
    const advancedSession = (await advanceResponse.json()) as {
      currentRound: number;
      agents: Array<{
        id: string;
        availableBalance: string;
      }>;
      bankerCustodyPositions: Array<{
        bankerAgentId: string;
        ownerAgentId: string;
        principal: string;
        accruedInterest: string;
        totalBalance: string;
      }>;
    };
    const advancedBanker = advancedSession.agents.find(
      (agent) => agent.id === banker!.id,
    );

    expect(advanceResponse.status).toBe(200);
    expect(advancedSession.currentRound).toBe(1);
    expect(advancedBanker?.availableBalance).toBe('141.0000');
    expect(advancedSession.bankerCustodyPositions).toEqual([
      {
        bankerAgentId: banker!.id,
        ownerAgentId: trader!.id,
        principal: '40.0000',
        accruedInterest: '1.0000',
        totalBalance: '41.0000',
      },
    ]);
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

  it('returns 400 for an invalid round advancement payload', async () => {
    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'HTTP Invalid Round Table',
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
      `${baseUrl}/api/game/sessions/${createdSession.id}/rounds/advance`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          interestRateBps: -1,
        }),
      },
    );
    const body = (await response.json()) as {
      statusCode: number;
      message: string;
    };

    expect(response.status).toBe(400);
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Request validation failed.');
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
