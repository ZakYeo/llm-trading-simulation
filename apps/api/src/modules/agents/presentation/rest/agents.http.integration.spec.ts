import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app.factory.js';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

async function createAgentSession(baseUrl: string) {
  const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Agent Table',
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

  return (await createResponse.json()) as { id: string };
}

async function readNextSseEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<{ event: string; data: string }> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      throw new Error('SSE stream closed before an event was received');
    }

    buffer += decoder.decode(value, { stream: true });
    const separatorIndex = buffer.indexOf('\n\n');

    if (separatorIndex === -1) {
      continue;
    }

    const rawEvent = buffer.slice(0, separatorIndex);
    const event = rawEvent.match(/^event:\s*(.+)$/m)?.[1];
    const data = rawEvent
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.slice(6))
      .join('\n');

    if (!event || !data) {
      buffer = buffer.slice(separatorIndex + 2);
      continue;
    }

    return { event, data };
  }
}

async function readSseEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  count: number,
) {
  const events: Array<{ event: string; data: string }> = [];

  for (let index = 0; index < count; index += 1) {
    events.push(await readNextSseEvent(reader));
  }

  return events;
}

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
    delete process.env.AGENT_MOCK_SCENARIO;
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
    expect(createResponse.status).toBe(201);
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

  it('streams message typing events and progress over SSE for a session', async () => {
    const createdSession = await createAgentSession(baseUrl);
    const abortController = new AbortController();

    const sseResponse = await fetch(
      `${baseUrl}/api/agents/sessions/${createdSession.id}/events`,
      {
        headers: {
          accept: 'text/event-stream',
        },
        signal: abortController.signal,
      },
    );

    expect(sseResponse.status).toBe(200);
    expect(sseResponse.headers.get('content-type')).toContain(
      'text/event-stream',
    );
    expect(sseResponse.body).toBeTruthy();

    const reader = sseResponse.body!.getReader();
    const eventPromises = readSseEvents(reader, 4);

    const turnResponse = await fetch(
      `${baseUrl}/api/agents/sessions/${createdSession.id}/turns/communicate`,
      {
        method: 'POST',
      },
    );

    expect(turnResponse.status).toBe(201);

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const streamedEvents = await Promise.race([
      eventPromises,
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error('Timed out waiting for SSE event'));
        }, 5_000);
      }),
    ]).finally(() => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    });

    abortController.abort();
    await reader.cancel().catch(() => undefined);

    const replayResponse = await fetch(
      `${baseUrl}/api/replay/sessions/${createdSession.id}`,
    );
    expect(replayResponse.status).toBe(200);
    const replay = (await replayResponse.json()) as {
      events: Array<{
        id: string;
        type: string;
        content?: string;
      }>;
    };

    expect(streamedEvents.map((event) => event.event)).toEqual([
      'message_stream_started',
      'message_stream_delta',
      'message_stream_completed',
      'action_progressed',
    ]);
    expect(JSON.parse(streamedEvents[0].data)).toEqual(
      expect.objectContaining({
        type: 'message_stream_started',
        gameSessionId: createdSession.id,
        roundNumber: 0,
        turnNumber: 1,
      }),
    );
    expect(JSON.parse(streamedEvents[1].data)).toEqual(
      expect.objectContaining({
        type: 'message_stream_delta',
        gameSessionId: createdSession.id,
        delta: expect.any(String),
        content: expect.any(String),
      }),
    );
    expect(JSON.parse(streamedEvents[2].data)).toEqual(
      expect.objectContaining({
        type: 'message_stream_completed',
        gameSessionId: createdSession.id,
        content: expect.any(String),
      }),
    );
    expect(JSON.parse(streamedEvents[3].data)).toEqual(
      expect.objectContaining({
        type: 'action_progressed',
        gameSessionId: createdSession.id,
        roundNumber: 0,
        turnNumber: 1,
        streamId: expect.any(String),
        messageId: expect.any(String),
      }),
    );
    expect(
      replay.events.some(
        (event) =>
          event.type === 'message' &&
          event.id === JSON.parse(streamedEvents[3].data).messageId &&
          typeof event.content === 'string' &&
          event.content.length > 0,
      ),
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
    expect(sessionResponse.status).toBe(200);
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
            action.actionType === 'place_funds_with_banker' &&
            action.amount === '10',
        ),
      ),
    ).toBe(true);
    expect(
      body.turns.some((turn) =>
        turn.actionRecords.some(
          (action) =>
            action.actionType === 'redeem_funds_from_banker' &&
            action.amount === '2.5',
        ),
      ),
    ).toBe(true);
    expect(banker?.availableBalance).toBe('107.5000');
    expect(trader?.availableBalance).toBe('92.5000');
  });

  it('persists rejected proposals without mutating balances', async () => {
    process.env.AGENT_MOCK_SCENARIO = 'reject_proposal';

    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Rejected Proposal Table',
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
          turnCount: 3,
        }),
      },
    );
    const body = (await response.json()) as {
      turns: Array<{
        actionRecords: Array<{ actionType: string }>;
      }>;
    };
    const sessionResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}`,
    );
    expect(sessionResponse.status).toBe(200);
    const session = (await sessionResponse.json()) as {
      agents: Array<{
        role: string;
        availableBalance: string;
      }>;
    };
    const banker = session.agents.find((agent) => agent.role === 'banker');
    const trader = session.agents.find((agent) => agent.role === 'trader');

    expect(response.status).toBe(201);
    expect(
      body.turns.some((turn) =>
        turn.actionRecords.some(
          (action) => action.actionType === 'reject_payment_request',
        ),
      ),
    ).toBe(true);
    expect(banker?.availableBalance).toBe('110.0000');
    expect(trader?.availableBalance).toBe('90.0000');

    delete process.env.AGENT_MOCK_SCENARIO;
  });

  it('persists counter-proposals and settles the accepted counter amount', async () => {
    process.env.AGENT_MOCK_SCENARIO = 'counter_proposal';

    const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Counter Proposal Table',
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
          turnCount: 4,
        }),
      },
    );
    const body = (await response.json()) as {
      turns: Array<{
        actionRecords: Array<{
          actionType: string;
          amount?: string;
          relatedProposalActionId?: string;
        }>;
      }>;
    };
    const sessionResponse = await fetch(
      `${baseUrl}/api/game/sessions/${createdSession.id}`,
    );
    expect(sessionResponse.status).toBe(200);
    const session = (await sessionResponse.json()) as {
      agents: Array<{
        role: string;
        availableBalance: string;
      }>;
    };
    const banker = session.agents.find((agent) => agent.role === 'banker');
    const trader = session.agents.find((agent) => agent.role === 'trader');
    const flattenedActions = body.turns.flatMap((turn) => turn.actionRecords);
    const counterAction = flattenedActions.find(
      (action) =>
        action.actionType === 'counter_payment_request' &&
        action.amount === '8.5',
    );
    const acceptance = flattenedActions.find(
      (action) =>
        action.actionType === 'accept_payment_request' &&
        action.relatedProposalActionId,
    );

    expect(response.status).toBe(201);
    expect(counterAction).toBeDefined();
    expect(acceptance?.relatedProposalActionId).toBeDefined();
    expect(banker?.availableBalance).toBe('107.5000');
    expect(trader?.availableBalance).toBe('101.0000');

    delete process.env.AGENT_MOCK_SCENARIO;
  });
});
