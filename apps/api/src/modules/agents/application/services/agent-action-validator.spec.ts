import { describe, expect, it } from 'vitest';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { AccountBalance } from '../../../game/domain/entities/account-balance.js';
import { BankerCustodyPosition } from '../../../game/domain/entities/banker-custody-position.js';
import { GameAgent } from '../../../game/domain/entities/game-agent.js';
import { GameSession } from '../../../game/domain/entities/game-session.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AgentActionValidator } from './agent-action-validator.js';

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

describe('AgentActionValidator', () => {
  it('returns recipient and related proposal id for a valid counter-proposal', () => {
    const validator = new AgentActionValidator();

    const validated = validator.validate(
      createSession(),
      'agent-1',
      {
        type: 'counter_payment_request',
        proposalActionId: 'action-1',
        recipientAgentId: 'agent-2',
        amount: '8.5000',
        rationale: 'Lower amount only.',
      },
      [
        {
          id: 'action-1',
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          agentId: 'agent-2',
          recipientAgentId: 'agent-1',
          actionType: 'request_payment',
          amount: '15.0000',
          content: 'Fund me.',
          createdAt: new Date(Date.UTC(2026, 3, 8, 10, 0, 0)).toISOString(),
        },
      ],
    );

    expect(validated).toEqual({
      recipientAgentId: 'agent-2',
      relatedProposalActionId: 'action-1',
    });
  });

  it('rejects banker-to-trader funding proposals through direct transfer', () => {
    const validator = new AgentActionValidator();

    expect(() =>
      validator.validate(
        createSession(),
        'agent-2',
        {
          type: 'request_payment',
          recipientAgentId: 'agent-1',
          amount: '12.5000',
          rationale: 'Please fund my trading book.',
        },
        [],
      ),
    ).toThrow('Banker-to-trader funding proposals are not supported yet.');
  });

  it('rejects custody actions that do not target a banker', () => {
    const validator = new AgentActionValidator();

    expect(() =>
      validator.validate(
        createSession(),
        'agent-2',
        {
          type: 'place_funds_with_banker',
          recipientAgentId: 'agent-2',
          amount: '10.0000',
        },
        [],
      ),
    ).toThrow('Agent communication target must be another agent');
  });

  it('rejects proposal responses when the proposal is already resolved', () => {
    const validator = new AgentActionValidator();

    expect(() =>
      validator.validate(
        createSession(),
        'agent-1',
        {
          type: 'accept_payment_request',
          proposalActionId: 'action-1',
        },
        [
          {
            id: 'action-1',
            gameSessionId: 'game-1',
            roundNumber: 1,
            turnNumber: 2,
            agentId: 'agent-2',
            recipientAgentId: 'agent-1',
            actionType: 'request_payment',
            amount: '15.0000',
            content: 'Fund me.',
            createdAt: new Date(Date.UTC(2026, 3, 8, 10, 0, 0)).toISOString(),
          },
          {
            id: 'action-2',
            gameSessionId: 'game-1',
            roundNumber: 1,
            turnNumber: 3,
            agentId: 'agent-1',
            recipientAgentId: null,
            relatedProposalActionId: 'action-1',
            actionType: 'reject_payment_request',
            content: 'No.',
            createdAt: new Date(Date.UTC(2026, 3, 8, 10, 0, 1)).toISOString(),
          },
        ],
      ),
    ).toThrow('Transfer proposal has already been resolved.');
  });
});
