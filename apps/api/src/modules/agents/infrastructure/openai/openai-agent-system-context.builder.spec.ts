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
      .addTreasuryContextSummary()
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
      'Treasury context: banker id = banker-1 banker name = Banker Bot total custodied principal = 12.5000',
    );
    expect(prompt).toContain(
      'banker obligations visible to you: [owner=Trader Bot ownerId=trader-1 principal=12.5000 accrued=0.5000 total=13.0000]',
    );
    expect(prompt).toContain(
      "Role economics: as the banker, you improve your outcome by attracting and retaining trader trader-1's custodial funds",
    );
    expect(prompt).toContain(
      'Decision rule: compare the expected value of communicating, proposing, or responding against the value of waiting.',
    );
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
      }),
    )
      .addBaseSystemPrompt()
      .addRoleDirective()
      .addTurnSignal()
      .build();

    expect(prompt).toContain(
      'Role economics: as the trader, you improve your outcome by deciding whether to place funds with banker banker-1',
    );
    expect(prompt).toContain(
      'Current opportunity: banker banker-1 has already opened a private channel with you',
    );
  });
});
