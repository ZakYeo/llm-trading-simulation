import type { AgentTurnContext } from '@llm-sim/mcp-contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { MockAgentGateway } from './mock-agent.gateway.js';

function createTraderContext(): AgentTurnContext {
  return {
    gameId: 'game-1',
    sessionName: 'Mock Market Check',
    round: 0,
    turnNumber: 1,
    self: {
      agentId: 'trader-1',
      name: 'Trader Bot',
      role: 'trader',
      availableBalance: '100.0000',
      depositPrincipal: '0.0000',
      personalityProfile: {
        kind: 'trader',
        assertiveness: 5,
        riskAppetite: 7,
        convictionThreshold: 4,
      },
    },
    peers: [
      {
        agentId: 'banker-1',
        name: 'Banker Bot',
        role: 'banker',
      },
    ],
    recentMessages: [],
    recentActions: [],
    actionableProposalsForSelf: [],
    negotiationState: {
      primaryCounterpartyAgentId: 'banker-1',
      primaryCounterpartyName: 'Banker Bot',
      privateMessageExchangeCountWithPrimaryCounterparty: 0,
      unresolvedProposalExistsWithPrimaryCounterparty: false,
      conversationLikelyReadyForProposal: false,
      guidance: 'Evaluate the available capital allocation choices.',
    },
    treasuryContext: {
      bankerAgentId: 'banker-1',
      bankerName: 'Banker Bot',
      totalCustodiedPrincipal: '0.0000',
      totalCustodiedAccruedInterest: '0.0000',
      totalCustodiedBalance: '0.0000',
      selfCustodyPosition: null,
      obligationsForBanker: [],
    },
    marketContext: {
      visibleOpportunities: [
        {
          opportunityId: 'opp-bad',
          title: 'Crowded Carry Trap',
          summary: 'Poor low-return trade with drag.',
          riskLevel: 'low',
          listedRound: 0,
          settlementRound: 1,
          minCommitment: '5.0000',
          maxCommitment: '20.0000',
          estimatedNetReturnBps: -75,
          worstCaseReturnBps: -150,
          bestCaseReturnBps: 25,
        },
        {
          opportunityId: 'opp-risky',
          title: 'Binary Event Volatility',
          summary: 'Positive expected value with meaningful downside.',
          riskLevel: 'high',
          listedRound: 0,
          settlementRound: 1,
          minCommitment: '5.0000',
          maxCommitment: '25.0000',
          estimatedNetReturnBps: 300,
          worstCaseReturnBps: -800,
          bestCaseReturnBps: 1200,
        },
      ],
      selfOpenPositions: [],
      primaryCounterpartyOpenPositions: [],
      recentSettlements: [],
      exposureSummary: {
        selfOpenPositionCount: 0,
        selfOpenPrincipal: '0.0000',
        selfOpenWorstCaseDownside: '0.0000',
        selfOpenBestCaseUpside: '0.0000',
        selfLiquidBalance: '100.0000',
        selfReservedBalance: '0.0000',
        selfCustodiedBalance: '0.0000',
        primaryCounterpartyAgentId: 'banker-1',
        primaryCounterpartyName: 'Banker Bot',
        primaryCounterpartyRole: 'banker',
        primaryCounterpartyOpenPositionCount: 0,
        primaryCounterpartyOpenPrincipal: '0.0000',
        primaryCounterpartyOpenWorstCaseDownside: '0.0000',
        primaryCounterpartyOpenBestCaseUpside: '0.0000',
        primaryCounterpartyLiquidBalance: '100.0000',
        primaryCounterpartyReservedBalance: '0.0000',
        primaryCounterpartyCustodiedBalance: '0.0000',
      },
    },
    economicContext: {
      objective: 'Maximize expected fake-money outcome.',
      messagesDoNotMoveMoney: true,
      proposalsCanMoveMoney: true,
      acceptedProposalChangesBalances: true,
      finalizeDoesNotChangeState: true,
      unresolvedIncomingProposalCount: 0,
      unresolvedOutgoingProposalCount: 0,
    },
    actionSemantics: {
      sendPublicMessage: 'Broadcasts information.',
      sendPrivateMessage: 'Sends a private message.',
      proposeDirectTransfer: 'Creates a payment request.',
      counterDirectTransferProposal: 'Counters a payment request.',
      acceptDirectTransferProposal: 'Accepts a payment request.',
      rejectDirectTransferProposal: 'Rejects a payment request.',
      placeFundsWithBanker: 'Moves funds into custody.',
      redeemFundsFromBanker: 'Redeems custody.',
      openMarketPosition:
        'Commits balance to a listed market opportunity until settlement.',
      finalizeTurn: 'Ends the turn.',
    },
  };
}

describe('MockAgentGateway', () => {
  afterEach(() => {
    delete process.env.AGENT_MOCK_SCENARIO;
  });

  it('prefers the risky positive-EV market opportunity in the market scenario', async () => {
    process.env.AGENT_MOCK_SCENARIO = 'market_opportunity';
    const gateway = new MockAgentGateway();

    const action = await gateway.decideNextAction(createTraderContext());

    expect(action).toEqual({
      type: 'open_market_position',
      opportunityId: 'opp-risky',
      amount: '5.0000',
    });
  });
});
