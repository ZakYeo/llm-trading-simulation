import { describe, expect, it } from 'vitest';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { AccountBalance } from '../../../game/domain/entities/account-balance.js';
import { BankerCustodyPosition } from '../../../game/domain/entities/banker-custody-position.js';
import { GameAgent } from '../../../game/domain/entities/game-agent.js';
import { GameSession } from '../../../game/domain/entities/game-session.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { AgentActionRecord } from '../ports/agent-action-repository.port.js';
import type { AgentMessageRecord } from '../ports/agent-message-repository.port.js';
import { AgentTurnContextFactory } from './agent-turn-context.factory.js';

function createSession() {
  return new GameSession({
    id: 'game-1',
    name: 'Communication Table',
    status: 'active',
    currentRound: 1,
    agents: [
      new GameAgent({
        id: 'agent-1',
        name: 'Banker Bot',
        role: 'banker',
        balance: AccountBalance.open(Money.fromDecimal('100.0000')),
        depositAccount: DepositAccount.open(),
      }),
      new GameAgent({
        id: 'agent-2',
        name: 'Trader Bot',
        role: 'trader',
        balance: AccountBalance.open(Money.fromDecimal('100.0000')),
        depositAccount: DepositAccount.open(),
      }),
    ],
    bankerCustodyPositions: [
      new BankerCustodyPosition({
        bankerAgentId: 'agent-1',
        ownerAgentId: 'agent-2',
        principal: Money.fromDecimal('12.5000'),
        accruedInterest: Money.fromDecimal('0.5000'),
      }),
    ],
  });
}

function createRecentMessages(): AgentMessageRecord[] {
  return [
    {
      id: 'message-1',
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 1,
      senderAgentId: 'agent-1',
      recipientAgentId: 'agent-2',
      visibility: 'private',
      content: 'Share your strongest signal.',
      createdAt: new Date(Date.UTC(2026, 3, 8, 10, 0, 0)).toISOString(),
    },
    {
      id: 'message-2',
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 2,
      senderAgentId: 'agent-2',
      recipientAgentId: 'agent-1',
      visibility: 'private',
      content: 'I can place some idle cash if terms work.',
      createdAt: new Date(Date.UTC(2026, 3, 8, 10, 0, 1)).toISOString(),
    },
  ];
}

function createRecentActions(): AgentActionRecord[] {
  return [
    {
      id: 'action-1',
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 2,
      agentId: 'agent-2',
      recipientAgentId: 'agent-1',
      actionType: 'propose_direct_transfer',
      amount: '15.0000',
      content: 'I can turn this into a higher-return trade quickly.',
      createdAt: new Date(Date.UTC(2026, 3, 8, 10, 0, 2)).toISOString(),
    },
  ];
}

describe('AgentTurnContextFactory', () => {
  it('builds banker context with obligations and actionable proposals', () => {
    const factory = new AgentTurnContextFactory();

    const context = factory.build(
      createSession(),
      'agent-1',
      3,
      createRecentMessages(),
      createRecentActions(),
    );

    expect(context.self).toMatchObject({
      agentId: 'agent-1',
      name: 'Banker Bot',
      role: 'banker',
      availableBalance: '100.0000',
    });
    expect(context.peers).toEqual([
      {
        agentId: 'agent-2',
        name: 'Trader Bot',
        role: 'trader',
      },
    ]);
    expect(context.actionableProposalsForSelf).toEqual([
      {
        proposalActionId: 'action-1',
        proposerAgentId: 'agent-2',
        proposerName: 'Trader Bot',
        amount: '15.0000',
        rationale: 'I can turn this into a higher-return trade quickly.',
      },
    ]);
    expect(context.treasuryContext).toMatchObject({
      bankerAgentId: 'agent-1',
      bankerName: 'Banker Bot',
      totalCustodiedPrincipal: '12.5000',
      totalCustodiedAccruedInterest: '0.5000',
      totalCustodiedBalance: '13.0000',
      selfCustodyPosition: null,
      obligationsForBanker: [
        {
          ownerAgentId: 'agent-2',
          ownerName: 'Trader Bot',
          principal: '12.5000',
          accruedInterest: '0.5000',
          totalBalance: '13.0000',
        },
      ],
    });
    expect(context.negotiationState).toMatchObject({
      primaryCounterpartyAgentId: 'agent-2',
      privateMessageExchangeCountWithPrimaryCounterparty: 2,
      unresolvedProposalExistsWithPrimaryCounterparty: true,
      conversationLikelyReadyForProposal: false,
    });
    expect(context.economicContext).toMatchObject({
      unresolvedIncomingProposalCount: 1,
      unresolvedOutgoingProposalCount: 0,
    });
  });

  it('builds trader context with self custody position and no banker obligations', () => {
    const factory = new AgentTurnContextFactory();

    const context = factory.build(
      createSession(),
      'agent-2',
      3,
      createRecentMessages(),
      createRecentActions(),
    );

    expect(context.self).toMatchObject({
      agentId: 'agent-2',
      name: 'Trader Bot',
      role: 'trader',
    });
    expect(context.actionableProposalsForSelf).toHaveLength(0);
    expect(context.treasuryContext).toMatchObject({
      bankerAgentId: 'agent-1',
      bankerName: 'Banker Bot',
      totalCustodiedPrincipal: '12.5000',
      totalCustodiedAccruedInterest: '0.5000',
      totalCustodiedBalance: '13.0000',
      selfCustodyPosition: {
        bankerAgentId: 'agent-1',
        principal: '12.5000',
        accruedInterest: '0.5000',
        totalBalance: '13.0000',
      },
      obligationsForBanker: [],
    });
    expect(context.negotiationState).toMatchObject({
      primaryCounterpartyAgentId: 'agent-1',
      privateMessageExchangeCountWithPrimaryCounterparty: 2,
      unresolvedProposalExistsWithPrimaryCounterparty: true,
      conversationLikelyReadyForProposal: false,
    });
    expect(context.economicContext).toMatchObject({
      unresolvedIncomingProposalCount: 0,
      unresolvedOutgoingProposalCount: 1,
    });
  });

  it('marks banker and trader as proposal-ready when private exchange exists without unresolved proposals', () => {
    const factory = new AgentTurnContextFactory();

    const context = factory.build(
      createSession(),
      'agent-1',
      3,
      createRecentMessages(),
      [],
    );

    expect(context.negotiationState).toMatchObject({
      primaryCounterpartyAgentId: 'agent-2',
      privateMessageExchangeCountWithPrimaryCounterparty: 2,
      unresolvedProposalExistsWithPrimaryCounterparty: false,
      conversationLikelyReadyForProposal: true,
    });
    expect(context.negotiationState.guidance).toContain(
      'executable transfer proposal may now be higher value',
    );
  });

  it('throws when asked to build context for an agent outside the session', () => {
    const factory = new AgentTurnContextFactory();

    expect(() =>
      factory.build(createSession(), 'missing-agent', 1, [], []),
    ).toThrow('Agent must exist in the session to build context.');
  });
});
