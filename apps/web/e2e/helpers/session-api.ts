import type { APIRequestContext } from '@playwright/test';

const apiBaseUrl = 'http://127.0.0.1:3100/api';

export interface CreatedSession {
  id: string;
  name: string;
  agents: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

async function expectOk(
  response: { ok(): boolean; status(): number },
  body: string,
) {
  if (!response.ok()) {
    throw new Error(`Unexpected API status ${response.status()}: ${body}`);
  }
}

export async function createBankerTraderSession(
  request: APIRequestContext,
  name: string,
): Promise<CreatedSession> {
  const response = await request.post(`${apiBaseUrl}/game/sessions`, {
    data: {
      name,
      initialBalance: '100.0000',
      agents: [
        { name: 'Banker Bot', role: 'banker' },
        { name: 'Trader Bot', role: 'trader' },
      ],
    },
  });
  const body = await response.text();

  await expectOk(response, body);

  return JSON.parse(body) as CreatedSession;
}

export async function placeFundsWithBanker(
  request: APIRequestContext,
  session: CreatedSession,
  amount: string,
) {
  const banker = session.agents.find((agent) => agent.role === 'banker');
  const trader = session.agents.find((agent) => agent.role === 'trader');

  if (!banker || !trader) {
    throw new Error('Expected banker and trader in test session.');
  }

  const response = await request.patch(
    `${apiBaseUrl}/game/sessions/${session.id}/custody/place`,
    {
      data: {
        ownerAgentId: trader.id,
        bankerAgentId: banker.id,
        amount,
      },
    },
  );
  const body = await response.text();

  await expectOk(response, body);
}

export async function advanceRound(
  request: APIRequestContext,
  sessionId: string,
  interestRateBps = 250,
) {
  const response = await request.patch(
    `${apiBaseUrl}/game/sessions/${sessionId}/rounds/advance`,
    {
      data: {
        interestRateBps,
      },
    },
  );
  const body = await response.text();

  await expectOk(response, body);
}
