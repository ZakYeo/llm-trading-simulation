import type { AgentTurnContext } from '@llm-sim/mcp-contracts';
import { describe, expect, it, vi } from 'vitest';

import { OpenAiAgentGateway } from './openai-agent.gateway.js';

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
      personalityProfile: {
        kind: 'trader',
        assertiveness: 6,
        riskAppetite: 8,
        convictionThreshold: 3,
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
          signalQuality: 'low',
          holdingPeriodRounds: 1,
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

  it('streams message content before returning the finalized action', async () => {
    const callbacks = {
      onMessageStreamStarted: vi.fn(),
      onMessageStreamDelta: vi.fn(),
      onMessageStreamCompleted: vi.fn(),
      onMessageStreamAborted: vi.fn(),
    };
    const client = {
      responses: {
        stream: vi.fn().mockResolvedValue(
          (async function* () {
            yield {
              type: 'response.output_text.delta',
              delta:
                '{"type":"send_private_message","recipientAgentId":"banker-1","content":"Hello',
            };
            yield {
              type: 'response.output_text.delta',
              delta:
                ' Banker","amount":null,"rationale":null,"proposalActionId":null,"opportunityId":null,"reasoning":"Short note."}',
            };
          })(),
        ),
        create: vi.fn(),
      },
    };
    const gateway = new OpenAiAgentGateway(
      client as never,
      'gpt-test',
      undefined,
      true,
    );

    const action = await gateway.decideNextAction(createContext(), callbacks);

    expect(action).toEqual({
      type: 'send_private_message',
      recipientAgentId: 'banker-1',
      content: 'Hello Banker',
      reasoning: 'Short note.',
    });
    expect(callbacks.onMessageStreamStarted).toHaveBeenCalledTimes(1);
    expect(callbacks.onMessageStreamDelta).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: 'private',
        recipientAgentId: 'banker-1',
        content: 'Hello',
      }),
    );
    expect(callbacks.onMessageStreamDelta).toHaveBeenLastCalledWith(
      expect.objectContaining({
        content: 'Hello Banker',
      }),
    );
    expect(callbacks.onMessageStreamCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: 'private',
        recipientAgentId: 'banker-1',
        content: 'Hello Banker',
      }),
    );
    expect(callbacks.onMessageStreamAborted).not.toHaveBeenCalled();
  });

  it('aborts a partial message stream when the final action is not a message', async () => {
    const callbacks = {
      onMessageStreamStarted: vi.fn(),
      onMessageStreamDelta: vi.fn(),
      onMessageStreamCompleted: vi.fn(),
      onMessageStreamAborted: vi.fn(),
    };
    const client = {
      responses: {
        stream: vi.fn().mockResolvedValue(
          (async function* () {
            yield {
              type: 'response.output_text.delta',
              delta:
                '{"type":"send_private_message","recipientAgentId":"banker-1","content":"Draft',
            };
            yield {
              type: 'response.output_text.delta',
              delta:
                '","amount":null,"rationale":null,"proposalActionId":null,"opportunityId":null,"reasoning":"Maybe"}',
            };
            yield {
              type: 'response.completed',
              response: {
                output_text: JSON.stringify({
                  type: 'finalize_turn',
                  recipientAgentId: null,
                  content: null,
                  amount: null,
                  rationale: null,
                  proposalActionId: null,
                  opportunityId: null,
                  reasoning: 'Hold.',
                }),
              },
            };
          })(),
        ),
        create: vi.fn(),
      },
    };
    const gateway = new OpenAiAgentGateway(
      client as never,
      'gpt-test',
      undefined,
      true,
    );

    const action = await gateway.decideNextAction(createContext(), callbacks);

    expect(action).toEqual({
      type: 'finalize_turn',
      reasoning: 'Hold.',
    });
    expect(callbacks.onMessageStreamAborted).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: 'private',
        recipientAgentId: 'banker-1',
        content: 'Draft',
      }),
    );
    expect(callbacks.onMessageStreamCompleted).not.toHaveBeenCalled();
  });
});
