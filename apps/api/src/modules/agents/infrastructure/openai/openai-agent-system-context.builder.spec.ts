import type { AgentTurnContext } from '@llm-sim/mcp-contracts';
import { describe, expect, it } from 'vitest';

import {
  defaultOpenAiAgentSystemPrompt,
  OpenAiAgentSystemContextBuilder,
} from './openai-agent-system-context.builder.js';

function createContext(
  overrides: Partial<AgentTurnContext> = {},
): AgentTurnContext {
  return {
    gameId: 'game-1',
    sessionName: 'Prompt Builder Session',
    round: 0,
    turnNumber: 2,
    self: {
      agentId: 'banker-1',
      name: 'Banker Bot',
      role: 'banker',
      availableBalance: '100.0000',
      depositPrincipal: '0.0000',
      personalityProfile: {
        kind: 'banker',
        warmth: 8,
        salesAggression: 7,
        riskDiscipline: 9,
      },
    },
    peers: [
      {
        agentId: 'trader-1',
        name: 'Trader Bot',
        role: 'trader',
      },
    ],
    recentMessages: [
      {
        senderAgentId: 'banker-1',
        senderName: 'Banker Bot',
        recipientAgentId: 'trader-1',
        visibility: 'private',
        content: 'Share your liquidity needs.',
      },
    ],
    recentActions: [],
    actionableProposalsForSelf: [],
    negotiationState: {
      primaryCounterpartyAgentId: 'trader-1',
      primaryCounterpartyName: 'Trader Bot',
      privateMessageExchangeCountWithPrimaryCounterparty: 1,
      unresolvedProposalExistsWithPrimaryCounterparty: false,
      conversationLikelyReadyForProposal: true,
      guidance: 'Advance discussion if useful.',
    },
    treasuryContext: {
      bankerAgentId: 'banker-1',
      bankerName: 'Banker Bot',
      totalCustodiedPrincipal: '12.5000',
      totalCustodiedAccruedInterest: '0.5000',
      totalCustodiedBalance: '13.0000',
      selfCustodyPosition: null,
      obligationsForBanker: [
        {
          ownerAgentId: 'trader-1',
          ownerName: 'Trader Bot',
          principal: '12.5000',
          accruedInterest: '0.5000',
          totalBalance: '13.0000',
        },
      ],
    },
    marketContext: {
      visibleOpportunities: [
        {
          opportunityId: 'opp-risky',
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
      primaryCounterpartyOpenPositions: [
        {
          opportunityId: 'opp-risky',
          opportunityTitle: 'Binary Event Volatility',
          principal: '9.0000',
          entryRound: 0,
          settlementRound: 1,
          entryFeeAmount: '0.0180',
          entrySlippageBps: 24,
          effectiveResolutionReturnBps: 1176,
        },
      ],
      recentSettlements: [],
      exposureSummary: {
        selfOpenPositionCount: 0,
        selfOpenPrincipal: '0.0000',
        selfOpenWorstCaseDownside: '0.0000',
        selfOpenBestCaseUpside: '0.0000',
        selfLiquidBalance: '100.0000',
        selfReservedBalance: '0.0000',
        selfCustodiedBalance: '0.0000',
        primaryCounterpartyAgentId: 'trader-1',
        primaryCounterpartyName: 'Trader Bot',
        primaryCounterpartyRole: 'trader',
        primaryCounterpartyOpenPositionCount: 1,
        primaryCounterpartyOpenPrincipal: '9.0000',
        primaryCounterpartyOpenWorstCaseDownside: '0.7200',
        primaryCounterpartyOpenBestCaseUpside: '1.0800',
        primaryCounterpartyLiquidBalance: '78.0000',
        primaryCounterpartyReservedBalance: '9.0000',
        primaryCounterpartyCustodiedBalance: '13.0000',
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
      sendPublicMessage: 'Broadcasts information to every agent.',
      sendPrivateMessage: 'Sends a message to one peer without moving money.',
      proposeDirectTransfer:
        'Creates a concrete executable payment request where the recipient would pay the proposer if accepted.',
      counterDirectTransferProposal:
        'Counters a pending payment request with a revised amount back to the proposer.',
      acceptDirectTransferProposal:
        'Accepts a pending payment request and changes balances immediately.',
      rejectDirectTransferProposal:
        'Rejects a pending payment request without moving money.',
      placeFundsWithBanker:
        'Moves the owner agent balance into banker custody while preserving beneficial ownership.',
      redeemFundsFromBanker:
        'Returns previously custodied funds from the banker back to the owner.',
      openMarketPosition:
        'Commits balance to a listed market opportunity until settlement.',
      finalizeTurn: 'Ends the turn without moving money.',
    },
    ...overrides,
  };
}

describe('OpenAiAgentSystemContextBuilder', () => {
  it('builds the current system context prompt from chained sections', () => {
    const prompt = new OpenAiAgentSystemContextBuilder(createContext())
      .addBaseSystemPrompt()
      .addPeerSummary()
      .addEconomicContextSummary()
      .addPersonalityProfileSummary()
      .addTreasuryContextSummary()
      .addMarketContextSummary()
      .addActionSemanticsSummary()
      .addActionableProposalSummary()
      .addNegotiationStateSummary()
      .addRoleDirective()
      .addTurnSignal()
      .build();

    expect(prompt).toContain(defaultOpenAiAgentSystemPrompt);
    expect(prompt).toContain(
      'Valid peer targets: [id=trader-1 name=Trader Bot role=trader]',
    );
    expect(prompt).toContain(
      'Personality profile: banker warmth = 8 (high), sales aggression = 7 (high), risk discipline = 9 (high).',
    );
    expect(prompt).toContain(
      'Treasury context: banker id = banker-1 banker name = Banker Bot total custodied principal = 12.5000',
    );
    expect(prompt).toContain(
      'banker obligations visible to you: [owner=Trader Bot ownerId=trader-1 principal=12.5000 accrued=0.5000 total=13.0000]',
    );
    expect(prompt).toContain(
      'Market context: visible market opportunities: [id=opp-risky title=Binary Event Volatility',
    );
    expect(prompt).toContain('signalQuality=low holdingPeriodRounds=1');
    expect(prompt).toContain(
      'primary counterparty open market positions: [id=opp-risky title=Binary Event Volatility principal=9.0000',
    );
    expect(prompt).toContain(
      'Exposure summary: self open position count = 0 self open principal = 0.0000',
    );
    expect(prompt).toContain(
      'Only positions listed as open are currently open.',
    );
    expect(prompt).toContain(
      "Role economics: as the banker, you improve your outcome by attracting and retaining trader trader-1's custodial funds",
    );
    expect(prompt).toContain('messaging.send_public = Broadcasts information');
    expect(prompt).toContain(
      'transfer.request_payment = Creates a concrete executable payment request',
    );
    expect(prompt).toContain(
      'treasury.place_with_banker = Moves the owner agent balance into banker custody while preserving beneficial ownership.',
    );
    expect(prompt).toContain(
      'turn.finalize = Ends the turn without moving money.',
    );
    expect(prompt).not.toContain('Reject obviously weak opportunities');
    expect(prompt).not.toContain(
      'Action semantics: send_public_message = Broadcasts information',
    );
    expect(prompt).not.toContain('place_funds_with_banker');
    expect(prompt).not.toContain('finalize_turn');
    expect(prompt).toContain(
      'Decision rule: compare the expected value of communicating, proposing, or responding against the value of waiting.',
    );
  });

  it('uses namespaced MCP tool names in the default system prompt', () => {
    expect(defaultOpenAiAgentSystemPrompt).toContain(
      'transfer.request_payment',
    );
    expect(defaultOpenAiAgentSystemPrompt).toContain(
      'treasury.place_with_banker',
    );
    expect(defaultOpenAiAgentSystemPrompt).toContain('market.open_position');
    expect(defaultOpenAiAgentSystemPrompt).toContain('turn.finalize');
    expect(defaultOpenAiAgentSystemPrompt).not.toContain(
      'Use request_payment, counter_payment_request',
    );
    expect(defaultOpenAiAgentSystemPrompt).not.toContain(
      'use place_funds_with_banker',
    );
    expect(defaultOpenAiAgentSystemPrompt).not.toContain('finalize_turn');
  });

  it('allows role-specific tweaks by composing only selected sections', () => {
    const prompt = new OpenAiAgentSystemContextBuilder(
      createContext({
        self: {
          agentId: 'trader-1',
          name: 'Trader Bot',
          role: 'trader',
          availableBalance: '90.0000',
          depositPrincipal: '0.0000',
          personalityProfile: {
            kind: 'trader',
            assertiveness: 6,
            riskAppetite: 9,
            convictionThreshold: 2,
          },
        },
        peers: [
          {
            agentId: 'banker-1',
            name: 'Banker Bot',
            role: 'banker',
          },
        ],
        recentMessages: [
          {
            senderAgentId: 'banker-1',
            senderName: 'Banker Bot',
            recipientAgentId: 'trader-1',
            visibility: 'private',
            content: 'Funds can be placed in custody.',
          },
        ],
        treasuryContext: {
          bankerAgentId: 'banker-1',
          bankerName: 'Banker Bot',
          totalCustodiedPrincipal: '12.5000',
          totalCustodiedAccruedInterest: '0.5000',
          totalCustodiedBalance: '13.0000',
          selfCustodyPosition: null,
          obligationsForBanker: [],
        },
        marketContext: {
          visibleOpportunities: [
            {
              opportunityId: 'opp-risky',
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
            selfLiquidBalance: '90.0000',
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
            primaryCounterpartyCustodiedBalance: '13.0000',
          },
          executionCostModel: {
            entryFeeBps: 20,
            slippageRuleSummary:
              'Opening a market position charges a percentage entry fee and applies deterministic adverse slippage. Higher-risk, weaker-signal, and larger positions slip more.',
          },
        },
      }),
    )
      .addBaseSystemPrompt()
      .addPersonalityProfileSummary()
      .addRoleDirective()
      .addTurnSignal()
      .build();

    expect(prompt).toContain(
      'Personality profile: trader assertiveness = 6 (balanced), risk appetite = 9 (high), conviction threshold = 2 (low).',
    );
    expect(prompt).toContain(
      'Role economics: as the trader, you improve your outcome by deciding whether to place funds with banker banker-1',
    );
    expect(prompt).toContain(
      'Current opportunity: at least one listed market opportunity is available.',
    );
  });
});
