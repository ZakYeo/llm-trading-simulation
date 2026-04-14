import { describe, expect, it, vi } from 'vitest';

import { OpenAiAgentGateway } from './openai-agent.gateway.js';
import type { AgentTurnContext } from '@llm-sim/mcp-contracts';

function createContext(): AgentTurnContext {
  return {
    gameId: 'game-1',
    sessionName: 'Gateway Test',
    round: 0,
    turnNumber: 1,
    self: {
      agentId: 'trader-1',
      name: 'Trader Bot',
      role: 'trader',
      availableBalance: '100.0000',
      depositPrincipal: '0.0000',
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
      guidance: 'Evaluate visible opportunities.',
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
          opportunityId:
            '99564828-4be8-4957-a5b1-a2c48495ccb1-risky-opportunity-r0',
          title: 'Binary Event Volatility',
          summary: 'High variance one-round event trade.',
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

describe('OpenAiAgentGateway', () => {
  it('normalizes malformed market opportunity ids using the visible opportunity suffix', async () => {
    const client = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({
            type: 'open_market_position',
            recipientAgentId: null,
            content: null,
            amount: '5.0000',
            rationale: null,
            proposalActionId: null,
            opportunityId:
              '99564828-4be8-a5b1-a4bb-33d1294eb9ba-risky-opportunity-r0',
            reasoning: 'Positive expected value exceeds passive alternatives.',
          }),
        }),
      },
    };
    const gateway = new OpenAiAgentGateway(
      client as never,
      'gpt-test',
      undefined,
      true,
    );

    const action = await gateway.decideNextAction(createContext());

    expect(action).toEqual({
      type: 'open_market_position',
      opportunityId:
        '99564828-4be8-4957-a5b1-a2c48495ccb1-risky-opportunity-r0',
      amount: '5.0000',
      reasoning: 'Positive expected value exceeds passive alternatives.',
    });
  });

  it('clamps market position amounts to the opportunity max commitment', async () => {
    const client = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({
            type: 'open_market_position',
            recipientAgentId: null,
            content: null,
            amount: '100.0000',
            rationale: null,
            proposalActionId: null,
            opportunityId: 'Binary Event Volatility',
            reasoning: 'Highest expected return justifies a large allocation.',
          }),
        }),
      },
    };
    const gateway = new OpenAiAgentGateway(
      client as never,
      'gpt-test',
      undefined,
      true,
    );

    const action = await gateway.decideNextAction(createContext());

    expect(action).toEqual({
      type: 'open_market_position',
      opportunityId:
        '99564828-4be8-4957-a5b1-a2c48495ccb1-risky-opportunity-r0',
      amount: '25.0000',
      reasoning: 'Highest expected return justifies a large allocation.',
    });
  });
});
