import { describe, expect, it } from 'vitest';

import {
  agentActionSchema,
  agentDecisionEnvelopeSchema,
  agentToolInvocationSchema,
  agentTurnContextSchema,
  parseAgentDecisionEnvelope,
  parseAgentToolInvocation,
} from './index.js';

function createValidEnvelopeInput() {
  return {
    tool: {
      name: 'transfer.request_payment',
      arguments: {
        recipientAgentId: 'agent-banker',
        amount: '12.5000',
        rationale: 'Pay before sharing the signal.',
      },
    },
    reasoning: 'Lock in value before disclosure.',
  };
}

function createValidTurnContext() {
  return {
    gameId: 'game-1',
    sessionName: 'Contract Test',
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
      guidance: 'Evaluate the available options.',
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
      visibleOpportunities: [],
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
      executionCostModel: {
        entryFeeBps: 20,
        slippageRuleSummary: 'Deterministic slippage applies to market opens.',
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
      openMarketPosition: 'Commits balance to a market opportunity.',
      finalizeTurn: 'Ends the turn.',
    },
  };
}

describe('agentToolInvocationSchema', () => {
  it('parses every supported tool shape', () => {
    const cases = [
      {
        name: 'messaging.send_public',
        arguments: { content: 'Public note' },
      },
      {
        name: 'messaging.send_private',
        arguments: {
          recipientAgentId: 'agent-banker',
          content: 'Private note',
        },
      },
      {
        name: 'transfer.request_payment',
        arguments: {
          recipientAgentId: 'agent-banker',
          amount: '12.5000',
          rationale: 'Value exchange.',
        },
      },
      {
        name: 'transfer.counter_payment_request',
        arguments: {
          proposalActionId: 'proposal-1',
          recipientAgentId: 'agent-banker',
          amount: '10.0000',
          rationale: 'Counteroffer.',
        },
      },
      {
        name: 'transfer.accept_payment_request',
        arguments: {
          proposalActionId: 'proposal-1',
        },
      },
      {
        name: 'transfer.reject_payment_request',
        arguments: {
          proposalActionId: 'proposal-1',
          rationale: 'Rejected.',
        },
      },
      {
        name: 'treasury.place_with_banker',
        arguments: {
          recipientAgentId: 'agent-banker',
          amount: '25.0000',
        },
      },
      {
        name: 'treasury.redeem_from_banker',
        arguments: {
          recipientAgentId: 'agent-banker',
          amount: '5.0000',
        },
      },
      {
        name: 'market.open_position',
        arguments: {
          opportunityId: 'opp-1',
          amount: '15.0000',
        },
      },
      {
        name: 'turn.finalize',
        arguments: {},
      },
    ];

    for (const tool of cases) {
      expect(agentToolInvocationSchema.parse(tool)).toEqual(tool);
      expect(parseAgentToolInvocation(tool)).toEqual(tool);
    }
  });

  it('rejects an unknown tool name', () => {
    expect(() =>
      agentToolInvocationSchema.parse({
        name: 'market.close_position',
        arguments: {},
      }),
    ).toThrow();
  });

  it('rejects wrong arguments for a known tool', () => {
    expect(() =>
      agentToolInvocationSchema.parse({
        name: 'messaging.send_public',
        arguments: {
          recipientAgentId: 'agent-banker',
          content: 'This should fail.',
        },
      }),
    ).toThrow();

    expect(() =>
      agentToolInvocationSchema.parse({
        name: 'turn.finalize',
        arguments: {
          content: 'Unexpected field',
        },
      }),
    ).toThrow();
  });

  it('enforces required fields per tool', () => {
    expect(() =>
      agentToolInvocationSchema.parse({
        name: 'transfer.request_payment',
        arguments: {
          recipientAgentId: 'agent-banker',
          rationale: 'Missing amount.',
        },
      }),
    ).toThrow();

    expect(() =>
      agentToolInvocationSchema.parse({
        name: 'market.open_position',
        arguments: {
          amount: '15.0000',
        },
      }),
    ).toThrow();
  });
});

describe('agentDecisionEnvelopeSchema', () => {
  it('parses a valid decision envelope with reasoning', () => {
    const input = createValidEnvelopeInput();

    expect(agentDecisionEnvelopeSchema.parse(input)).toEqual(input);
    expect(parseAgentDecisionEnvelope(input)).toEqual(input);
  });

  it('allows reasoning to be omitted', () => {
    expect(
      agentDecisionEnvelopeSchema.parse({
        tool: {
          name: 'turn.finalize',
          arguments: {},
        },
      }),
    ).toEqual({
      tool: {
        name: 'turn.finalize',
        arguments: {},
      },
    });
  });

  it('rejects extra top-level fields', () => {
    expect(() =>
      agentDecisionEnvelopeSchema.parse({
        ...createValidEnvelopeInput(),
        tools: [],
      }),
    ).toThrow();
  });
});

describe('legacy contract regressions', () => {
  it('still parses the existing AgentAction shape', () => {
    expect(
      agentActionSchema.parse({
        type: 'send_private_message',
        recipientAgentId: 'banker-1',
        content: 'Still supported.',
        reasoning: 'Regression coverage.',
      }),
    ).toEqual({
      type: 'send_private_message',
      recipientAgentId: 'banker-1',
      content: 'Still supported.',
      reasoning: 'Regression coverage.',
    });
  });

  it('still parses the existing AgentTurnContext shape', () => {
    expect(agentTurnContextSchema.parse(createValidTurnContext())).toEqual(
      createValidTurnContext(),
    );
  });
});
