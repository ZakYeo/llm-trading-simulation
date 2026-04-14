import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { INestApplication } from '@nestjs/common';

import { createApp } from '../../../../app.factory.js';
import { RunAgentCommunicationTurnUseCase } from '../../application/use-cases/run-agent-communication-turn.use-case.js';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

interface PatchedRunAgentCommunicationTurnUseCase {
  agentActionExecutor: {
    openMarketPositionUseCase: {
      execute: (...args: unknown[]) => Promise<unknown>;
    };
  };
}

describe.runIf(Boolean(testDatabaseUrl))(
  'Agents consistency integration',
  () => {
    let app: INestApplication;
    let prismaService: PrismaService;
    let baseUrl: string;
    let closeApp: (() => Promise<void>) | undefined;

    beforeAll(async () => {
      process.env.DATABASE_URL = testDatabaseUrl;
      process.env.AGENT_RUNTIME_PROVIDER = 'mock';

      app = await createApp();
      await app.listen(0, '127.0.0.1');

      prismaService = app.get(PrismaService);
      baseUrl = await app.getUrl();
      closeApp = async () => {
        await app.close();
      };
    });

    beforeEach(async () => {
      delete process.env.AGENT_MOCK_SCENARIO;
      await prismaService.gameSession.deleteMany();
    });

    afterAll(async () => {
      await prismaService.gameSession.deleteMany();
      await closeApp?.();
      delete process.env.AGENT_MOCK_SCENARIO;
      delete process.env.AGENT_RUNTIME_PROVIDER;
    });

    async function createBankerTraderSession() {
      const createResponse = await fetch(`${baseUrl}/api/game/sessions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Consistency Table',
          initialBalance: '100.0000',
          agents: [
            { name: 'Banker Bot', role: 'banker' },
            { name: 'Trader Bot', role: 'trader' },
          ],
        }),
      });

      expect(createResponse.status).toBe(201);

      return (await createResponse.json()) as { id: string };
    }

    it('keeps session state and replay aligned when a market position opens', async () => {
      process.env.AGENT_MOCK_SCENARIO = 'market_opportunity';
      const createdSession = await createBankerTraderSession();

      const response = await fetch(
        `${baseUrl}/api/agents/sessions/${createdSession.id}/rounds/orchestrate`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            turnCount: 1,
          }),
        },
      );

      expect(response.status).toBe(201);

      const sessionResponse = await fetch(
        `${baseUrl}/api/game/sessions/${createdSession.id}`,
      );
      expect(sessionResponse.status).toBe(200);
      const session = (await sessionResponse.json()) as {
        agents: Array<{
          role: string;
          availableBalance: string;
          reservedBalance: string;
        }>;
        marketPositions: Array<{
          opportunityId: string;
          ownerAgentId: string;
          principal: string;
        }>;
      };

      const replayResponse = await fetch(
        `${baseUrl}/api/replay/sessions/${createdSession.id}`,
      );
      expect(replayResponse.status).toBe(200);
      const replay = (await replayResponse.json()) as {
        events: Array<{
          type: string;
          actionType?: string;
          amount?: string;
          opportunityId?: string;
          ownerAgentId?: string;
        }>;
      };

      const trader = session.agents.find((agent) => agent.role === 'trader');
      const openAction = replay.events.find(
        (event) =>
          event.type === 'action' &&
          event.actionType === 'open_market_position',
      );
      const marketOpenedEvent = replay.events.find(
        (event) => event.type === 'market_position_opened',
      );

      expect(trader).toMatchObject({
        availableBalance: '95.0000',
        reservedBalance: '5.0000',
      });
      expect(session.marketPositions).toHaveLength(1);
      expect(session.marketPositions[0]).toMatchObject({
        principal: '5.0000',
      });
      expect(openAction).toBeDefined();
      expect(marketOpenedEvent).toBeDefined();
      expect(marketOpenedEvent).toMatchObject({
        opportunityId: session.marketPositions[0]?.opportunityId,
        ownerAgentId: session.marketPositions[0]?.ownerAgentId,
      });
      expect(Number.parseFloat(marketOpenedEvent?.amount ?? '0')).toBe(
        Number.parseFloat(session.marketPositions[0]?.principal ?? '0'),
      );
    });

    it('rolls back failed trader actions so replay does not leak ghost positions', async () => {
      process.env.AGENT_MOCK_SCENARIO = 'market_opportunity';
      const createdSession = await createBankerTraderSession();
      const runAgentCommunicationTurnUseCase = app.get(
        RunAgentCommunicationTurnUseCase,
      ) as unknown as PatchedRunAgentCommunicationTurnUseCase;
      const originalOpenMarketPositionUseCase =
        runAgentCommunicationTurnUseCase.agentActionExecutor
          .openMarketPositionUseCase;

      runAgentCommunicationTurnUseCase.agentActionExecutor.openMarketPositionUseCase =
        {
          execute: async () => {
            throw new Error('synthetic market failure');
          },
        };

      let response: Response;

      try {
        response = await fetch(
          `${baseUrl}/api/agents/sessions/${createdSession.id}/rounds/orchestrate`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              turnCount: 1,
            }),
          },
        );
      } finally {
        runAgentCommunicationTurnUseCase.agentActionExecutor.openMarketPositionUseCase =
          originalOpenMarketPositionUseCase;
      }

      expect(response.status).toBe(500);

      const sessionResponse = await fetch(
        `${baseUrl}/api/game/sessions/${createdSession.id}`,
      );
      expect(sessionResponse.status).toBe(200);
      const session = (await sessionResponse.json()) as {
        agents: Array<{
          role: string;
          availableBalance: string;
          reservedBalance: string;
        }>;
        marketPositions: Array<unknown>;
      };

      const replayResponse = await fetch(
        `${baseUrl}/api/replay/sessions/${createdSession.id}`,
      );
      expect(replayResponse.status).toBe(200);
      const replay = (await replayResponse.json()) as {
        events: Array<{
          type: string;
          actionType?: string;
        }>;
      };

      const trader = session.agents.find((agent) => agent.role === 'trader');

      expect(trader).toMatchObject({
        availableBalance: '100.0000',
        reservedBalance: '0.0000',
      });
      expect(session.marketPositions).toEqual([]);
      expect(
        replay.events.some(
          (event) =>
            event.type === 'action' &&
            event.actionType === 'open_market_position',
        ),
      ).toBe(false);
      expect(
        replay.events.some((event) => event.type === 'market_position_opened'),
      ).toBe(false);
      expect(replay.events).toHaveLength(2);
    });
  },
);
