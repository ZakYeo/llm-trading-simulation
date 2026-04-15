import { describe, expect, it } from 'vitest';

import { PrismaReplayReadModel } from './prisma-replay-read-model.js';

describe('PrismaReplayReadModel', () => {
  it('maps and sorts replay events from a prisma session record', async () => {
    const readModel = new PrismaReplayReadModel({
      gameSession: {
        async findUnique() {
          return {
            id: 'game-1',
            name: 'Replay Table',
            status: 'ACTIVE',
            currentRound: 1,
            rounds: [
              {
                id: 'round-1',
                roundNumber: 1,
                createdAt: new Date('2026-04-09T10:00:00.000Z'),
              },
            ],
            transfers: [
              {
                id: 'transfer-1',
                createdAt: new Date('2026-04-09T10:02:00.000Z'),
                amount: { toString: () => '15' },
                sourceAgentId: 'agent-1',
                sourceAgent: { name: 'Trader Bot' },
                destinationAgentId: 'agent-2',
                destinationAgent: { name: 'Banker Bot' },
              },
            ],
            deposits: [],
            withdrawals: [],
            custodyPlacements: [
              {
                id: 'custody-placement-1',
                createdAt: new Date('2026-04-09T10:01:00.000Z'),
                roundNumber: 1,
                amount: { toString: () => '10' },
                bankerAgentId: 'agent-2',
                bankerAgent: { name: 'Banker Bot' },
                ownerAgentId: 'agent-1',
                ownerAgent: { name: 'Trader Bot' },
              },
            ],
            custodyRedemptions: [],
            custodyAccruals: [],
            marketOpportunityListedEvents: [
              {
                id: 'market-listed-1',
                createdAt: new Date('2026-04-09T10:00:45.000Z'),
                roundNumber: 1,
                opportunityId: 'opp-1',
                opportunityTitle: 'Binary Event Volatility',
                opportunityCategory: 'EVENT',
                opportunitySummary: 'Wide payoff event trade.',
                opportunityRiskLevel: 'HIGH',
                listedRound: 1,
                settlementRound: 2,
                minCommitment: { toString: () => '5' },
                maxCommitment: { toString: () => '25' },
                estimatedNetReturnBps: 180,
                worstCaseReturnBps: -300,
                bestCaseReturnBps: 420,
              },
            ],
            marketOpportunityResolvedEvents: [
              {
                id: 'market-resolved-1',
                createdAt: new Date('2026-04-09T10:01:30.000Z'),
                roundNumber: 2,
                opportunityId: 'opp-1',
                opportunityTitle: 'Binary Event Volatility',
                opportunityCategory: 'EVENT',
                opportunitySummary: 'Wide payoff event trade.',
                opportunityRiskLevel: 'HIGH',
                listedRound: 1,
                settlementRound: 2,
                minCommitment: { toString: () => '5' },
                maxCommitment: { toString: () => '25' },
                estimatedNetReturnBps: 180,
                worstCaseReturnBps: -300,
                bestCaseReturnBps: 420,
                participantCount: 1,
                totalPrincipal: { toString: () => '12' },
                totalProfitOrLoss: { toString: () => '3.6' },
                participants: [
                  {
                    ownerAgentId: 'agent-1',
                    ownerAgent: { name: 'Trader Bot' },
                    principal: { toString: () => '12' },
                    profitOrLoss: { toString: () => '3.6' },
                  },
                ],
              },
            ],
            marketPositionOpens: [
              {
                id: 'market-open-1',
                createdAt: new Date('2026-04-09T10:01:15.000Z'),
                roundNumber: 1,
                amount: { toString: () => '12' },
                opportunityId: 'opp-1',
                opportunityTitle: 'Binary Event Volatility',
                ownerAgentId: 'agent-1',
                ownerAgent: { name: 'Trader Bot' },
                entryFeeBps: 20,
                entryFeeAmount: { toString: () => '0.024' },
                entrySlippageBps: 30,
                effectiveResolutionReturnBps: 390,
              },
            ],
            marketPositionSettlements: [],
            agentMessages: [
              {
                id: 'message-1',
                createdAt: new Date('2026-04-09T10:00:30.000Z'),
                roundNumber: 1,
                turnNumber: 1,
                senderAgentId: 'agent-2',
                senderAgent: { name: 'Banker Bot' },
                recipientAgentId: 'agent-1',
                recipientAgent: { name: 'Trader Bot' },
                visibility: 'PRIVATE',
                content: 'Terms are simple and tracked.',
              },
            ],
            agentTurnActions: [
              {
                id: 'action-1',
                createdAt: new Date('2026-04-09T10:01:00.000Z'),
                roundNumber: 1,
                turnNumber: 2,
                agentId: 'agent-1',
                agent: { name: 'Trader Bot' },
                recipientAgentId: 'agent-2',
                relatedProposalActionId: null,
                amount: { toString: () => '10' },
                content: null,
                actionType: 'PLACE_FUNDS_WITH_BANKER',
              },
            ],
          };
        },
      },
    } as never);

    const replay = await readModel.findByGameSessionId('game-1');

    expect(replay).toEqual({
      gameSession: {
        id: 'game-1',
        name: 'Replay Table',
        status: 'active',
        currentRound: 1,
      },
      rounds: [
        {
          id: 'round-1',
          roundNumber: 1,
          createdAt: '2026-04-09T10:00:00.000Z',
        },
      ],
      events: [
        {
          id: 'message-1',
          type: 'message',
          createdAt: '2026-04-09T10:00:30.000Z',
          roundNumber: 1,
          turnNumber: 1,
          senderAgentId: 'agent-2',
          senderAgentName: 'Banker Bot',
          recipientAgentId: 'agent-1',
          recipientAgentName: 'Trader Bot',
          visibility: 'private',
          content: 'Terms are simple and tracked.',
        },
        {
          id: 'market-listed-1',
          type: 'market_opportunity_listed',
          createdAt: '2026-04-09T10:00:45.000Z',
          roundNumber: 1,
          opportunityId: 'opp-1',
          opportunityTitle: 'Binary Event Volatility',
          opportunityCategory: 'event',
          opportunitySummary: 'Wide payoff event trade.',
          opportunityRiskLevel: 'high',
          listedRound: 1,
          settlementRound: 2,
          minCommitment: '5',
          maxCommitment: '25',
          estimatedNetReturnBps: 180,
          worstCaseReturnBps: -300,
          bestCaseReturnBps: 420,
        },
        {
          id: 'action-1',
          type: 'action',
          createdAt: '2026-04-09T10:01:00.000Z',
          roundNumber: 1,
          turnNumber: 2,
          agentId: 'agent-1',
          agentName: 'Trader Bot',
          recipientAgentId: 'agent-2',
          amount: '10',
          actionType: 'place_funds_with_banker',
        },
        {
          id: 'custody-placement-1',
          type: 'custody_placement',
          createdAt: '2026-04-09T10:01:00.000Z',
          roundNumber: 1,
          amount: '10',
          bankerAgentId: 'agent-2',
          bankerAgentName: 'Banker Bot',
          ownerAgentId: 'agent-1',
          ownerAgentName: 'Trader Bot',
        },
        {
          id: 'market-open-1',
          type: 'market_position_opened',
          createdAt: '2026-04-09T10:01:15.000Z',
          roundNumber: 1,
          amount: '12',
          opportunityId: 'opp-1',
          opportunityTitle: 'Binary Event Volatility',
          ownerAgentId: 'agent-1',
          ownerAgentName: 'Trader Bot',
          entryFeeBps: 20,
          entryFeeAmount: '0.024',
          entrySlippageBps: 30,
          effectiveResolutionReturnBps: 390,
        },
        {
          id: 'market-resolved-1',
          type: 'market_opportunity_resolved',
          createdAt: '2026-04-09T10:01:30.000Z',
          roundNumber: 2,
          opportunityId: 'opp-1',
          opportunityTitle: 'Binary Event Volatility',
          opportunityCategory: 'event',
          opportunitySummary: 'Wide payoff event trade.',
          opportunityRiskLevel: 'high',
          listedRound: 1,
          settlementRound: 2,
          minCommitment: '5',
          maxCommitment: '25',
          estimatedNetReturnBps: 180,
          worstCaseReturnBps: -300,
          bestCaseReturnBps: 420,
          participantCount: 1,
          totalPrincipal: '12',
          totalProfitOrLoss: '3.6',
          participantSettlements: [
            {
              ownerAgentId: 'agent-1',
              ownerAgentName: 'Trader Bot',
              principal: '12',
              profitOrLoss: '3.6',
            },
          ],
        },
        {
          id: 'transfer-1',
          type: 'transfer',
          createdAt: '2026-04-09T10:02:00.000Z',
          amount: '15',
          sourceAgentId: 'agent-1',
          sourceAgentName: 'Trader Bot',
          destinationAgentId: 'agent-2',
          destinationAgentName: 'Banker Bot',
        },
      ],
    });
  });

  it('returns null when the session is missing', async () => {
    const readModel = new PrismaReplayReadModel({
      gameSession: {
        async findUnique() {
          return null;
        },
      },
    } as never);

    await expect(readModel.findByGameSessionId('missing')).resolves.toBeNull();
  });
});
