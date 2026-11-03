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
      recentSettlements: [],
      exposureSummary: {
        selfOpenPositionCount: 0,
        selfOpenPrincipal: '0.0000',
        selfOpenWorstCaseDownside: '0.0000',
        selfOpenBestCaseUpside: '0.0000',
        selfLiquidBalance: '100.0000',
        selfReservedBalance: '0.0000',
        selfCustodiedBalance: '0.0000',
      },
      executionCostModel: {
        entryFeeBps: 20,
        slippageRuleSummary:
          'Opening a market position charges a percentage entry fee and applies deterministic adverse slippage. Higher-risk, weaker-signal, and larger positions slip more.',
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
  it('requires non-null message payload fields and parses the nested decision output', async () => {
    const context = createContext();
    const client = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({
            decision: {
              type: 'send_private_message',
              recipientAgentId: context.peers[0]!.agentId,
              content: 'Please quote a deposit rate.',
              decisionExplanation:
                'My risk appetite favors comparing deposit terms.',
            },
          }),
        }),
      },
    };
    const gateway = new OpenAiAgentGateway(client as never, 'gpt-test');
    const action = await gateway.decideNextAction(context);
    expect(action).toMatchObject({
      type: 'send_private_message',
      content: 'Please quote a deposit rate.',
    });
    const request = client.responses.create.mock.calls[0][0];
    const branch = request.text.format.schema.properties.decision.anyOf.find(
      (entry: { properties: { type: { enum: string[] } } }) =>
        entry.properties.type.enum[0] === 'send_private_message',
    );
    expect(branch.properties.recipientAgentId).toEqual({
      type: 'string',
      minLength: 1,
    });
    expect(branch.properties.content).toEqual({ type: 'string', minLength: 1 });
    expect(branch.required).toEqual(
      expect.arrayContaining([
        'recipientAgentId',
        'content',
        'decisionExplanation',
      ]),
    );
  });
  it('does not replace an incomplete message with a silent finalize action', async () => {
    const client = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({
            decision: {
              type: 'send_private_message',
              recipientAgentId: null,
              content: null,
              decisionExplanation: 'Ask about rates.',
            },
          }),
        }),
      },
    };
    const gateway = new OpenAiAgentGateway(client as never, 'gpt-test');
    await expect(gateway.decideNextAction(createContext())).rejects.toThrow(
      'requires recipientAgentId and content',
    );
  });

  it.each([true, false])(
    'surfaces exhausted credit errors instead of silently finalizing (strict=%s)',
    async (strict) => {
      const client = {
        responses: {
          create: vi
            .fn()
            .mockRejectedValue(
              new Error(
                'You have no credits remaining. Add credits to continue using the API.',
              ),
            ),
        },
      };
      const gateway = new OpenAiAgentGateway(
        client as never,
        'gpt-test',
        undefined,
        strict,
      );
      await expect(gateway.decideNextAction(createContext())).rejects.toThrow(
        'no API credits remaining',
      );
    },
  );

  it.each([
    [
      { type: 'send_private_message', depositRequestAmount: '20' },
      { depositTerms: { requestAmount: '20' } },
    ],
    [
      {
        type: 'send_private_message',
        depositRequestId: 'request',
        depositOfferAmount: '20',
        depositRateBps: 150,
      },
      {
        depositTerms: { requestId: 'request', offerAmount: '20', rateBps: 150 },
      },
    ],
    [
      { type: 'place_funds_with_banker', offerId: 'offer', amount: '20' },
      { offerId: 'offer', amount: '20' },
    ],
  ])('normalizes structured deposit output %j', async (decision, expected) => {
    const context = createContext();
    const client = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({
            recipientAgentId: context.peers[0]!.agentId,
            content: 'Let us discuss the deposit terms.',
            reasoning: null,
            decisionExplanation:
              'My cautious risk appetite favors comparing deposit terms.',
            ...decision,
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
    expect(await gateway.decideNextAction(context)).toMatchObject(expected);
    const request = JSON.stringify(client.responses.create.mock.calls[0]);
    expect(request).toContain('depositRequestAmount');
    expect(request).toContain('depositOfferAmount');
  });

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
