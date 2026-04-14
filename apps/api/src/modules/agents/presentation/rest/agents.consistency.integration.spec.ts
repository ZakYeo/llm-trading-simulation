import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { INestApplication } from '@nestjs/common';

import { createApp } from '../../../../app.factory.js';
import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';

import { RunAgentCommunicationTurnUseCase } from '../../application/use-cases/run-agent-communication-turn.use-case.js';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

interface PatchedRunAgentCommunicationTurnUseCase {
  agentGateway: {
    decideNextAction: (context: AgentTurnContext) => Promise<AgentAction>;
  };
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

    async function fetchSession(sessionId: string) {
      const sessionResponse = await fetch(
        `${baseUrl}/api/game/sessions/${sessionId}`,
      );
      expect(sessionResponse.status).toBe(200);

      return (await sessionResponse.json()) as {
        currentRound: number;
        agents: Array<{
          id: string;
          role: string;
          availableBalance: string;
          reservedBalance: string;
        }>;
        marketOpportunities: Array<{
          id: string;
          minCommitment: string;
        }>;
        marketPositions: Array<{
          opportunityId: string;
          ownerAgentId: string;
          principal: string;
        }>;
      };
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

    it('builds banker context from the current open position set after settlement and reopen', async () => {
      const createdSession = await createBankerTraderSession();
      const initialSession = await fetchSession(createdSession.id);
      const trader = initialSession.agents.find(
        (agent) => agent.role === 'trader',
      );

      expect(trader).toBeDefined();
      expect(initialSession.marketOpportunities).not.toHaveLength(0);

      const firstOpportunity = initialSession.marketOpportunities[0];
      expect(firstOpportunity).toBeDefined();

      const firstOpenResponse = await fetch(
        `${baseUrl}/api/game/sessions/${createdSession.id}/market/open`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            ownerAgentId: trader?.id,
            opportunityId: firstOpportunity?.id,
            amount: firstOpportunity?.minCommitment,
          }),
        },
      );
      expect(firstOpenResponse.status).toBe(200);

      const expectedSecondRound = initialSession.currentRound + 1;
      const advanceRoundResponse = await fetch(
        `${baseUrl}/api/game/sessions/${createdSession.id}/rounds/advance`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );
      expect(advanceRoundResponse.status).toBe(200);

      const secondRoundSession = await fetchSession(createdSession.id);
      expect(secondRoundSession.currentRound).toBe(expectedSecondRound);
      expect(secondRoundSession.marketPositions).toEqual([]);

      const secondOpportunity = secondRoundSession.marketOpportunities[0];
      expect(secondOpportunity).toBeDefined();
      expect(secondOpportunity?.id).not.toBe(firstOpportunity?.id);

      const secondOpenResponse = await fetch(
        `${baseUrl}/api/game/sessions/${createdSession.id}/market/open`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            ownerAgentId: trader?.id,
            opportunityId: secondOpportunity?.id,
            amount: secondOpportunity?.minCommitment,
          }),
        },
      );
      expect(secondOpenResponse.status).toBe(200);

      const runAgentCommunicationTurnUseCase = app.get(
        RunAgentCommunicationTurnUseCase,
      ) as unknown as PatchedRunAgentCommunicationTurnUseCase;
      const capturedContexts: AgentTurnContext[] = [];
      const originalDecideNextAction =
        runAgentCommunicationTurnUseCase.agentGateway.decideNextAction;

      runAgentCommunicationTurnUseCase.agentGateway.decideNextAction = async (
        context,
      ) => {
        capturedContexts.push(context);
        return { type: 'finalize_turn' };
      };

      try {
        await app.get(RunAgentCommunicationTurnUseCase).execute({
          gameSessionId: createdSession.id,
          turnNumber: 1,
        });
      } finally {
        runAgentCommunicationTurnUseCase.agentGateway.decideNextAction =
          originalDecideNextAction;
      }

      const bankerContext = capturedContexts.find(
        (context) => context.self.role === 'banker',
      );

      expect(bankerContext).toBeDefined();
      expect(
        bankerContext?.marketContext.primaryCounterpartyOpenPositions,
      ).toEqual([
        {
          opportunityId: secondOpportunity?.id,
          opportunityTitle: expect.any(String),
          principal: '5.0000',
          entryRound: expectedSecondRound,
          settlementRound: expect.any(Number),
        },
      ]);
      expect(
        bankerContext?.marketContext.primaryCounterpartyOpenPositions.some(
          (position) => position.opportunityId === firstOpportunity?.id,
        ),
      ).toBe(false);
      expect(bankerContext?.marketContext.exposureSummary).toMatchObject({
        primaryCounterpartyOpenPositionCount: 1,
        primaryCounterpartyOpenPrincipal: '5.0000',
        primaryCounterpartyReservedBalance: '5.0000',
      });
    });
  },
);
