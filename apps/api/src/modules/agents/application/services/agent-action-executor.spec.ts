import { describe, expect, it } from 'vitest';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { AccountBalance } from '../../../game/domain/entities/account-balance.js';
import { BankerCustodyPosition } from '../../../game/domain/entities/banker-custody-position.js';
import { GameAgent } from '../../../game/domain/entities/game-agent.js';
import { GameSession } from '../../../game/domain/entities/game-session.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type {
  AgentActionRecord,
  AgentActionRepositoryPort,
} from '../ports/agent-action-repository.port.js';
import type {
  AgentMessageRecord,
  AgentMessageRepositoryPort,
} from '../ports/agent-message-repository.port.js';
import { AgentActionExecutor } from './agent-action-executor.js';

class InMemoryAgentMessageRepository implements AgentMessageRepositoryPort {
  saved: AgentMessageRecord[] = [];

  async save(message: AgentMessageRecord): Promise<AgentMessageRecord> {
    const saved = {
      ...message,
      id: `message-${this.saved.length + 1}`,
      createdAt: new Date(
        Date.UTC(2026, 3, 8, 10, 0, this.saved.length),
      ).toISOString(),
    };
    this.saved.push(saved);
    return saved;
  }

  async findRecentByGameSessionId(): Promise<AgentMessageRecord[]> {
    return [...this.saved];
  }

  async deleteById(messageId: string): Promise<void> {
    this.saved = this.saved.filter((message) => message.id !== messageId);
  }
}

class InMemoryAgentActionRepository implements AgentActionRepositoryPort {
  saved: AgentActionRecord[] = [];

  async save(action: AgentActionRecord): Promise<AgentActionRecord> {
    const saved = {
      ...action,
      id: `action-${this.saved.length + 1}`,
      createdAt: new Date(
        Date.UTC(2026, 3, 8, 10, 0, this.saved.length),
      ).toISOString(),
    };
    this.saved.push(saved);
    return saved;
  }

  async findRecentByGameSessionId(): Promise<AgentActionRecord[]> {
    return [...this.saved];
  }

  async deleteById(actionId: string): Promise<void> {
    this.saved = this.saved.filter((action) => action.id !== actionId);
  }
}

class RecordingPlaceFundsWithBankerUseCase {
  calls: Array<{
    gameSessionId: string;
    ownerAgentId: string;
    bankerAgentId: string;
    amount: string;
  }> = [];

  async execute(input: {
    gameSessionId: string;
    ownerAgentId: string;
    bankerAgentId: string;
    amount: string;
  }) {
    this.calls.push(input);
    return createSession();
  }
}

class RecordingRedeemFundsFromBankerUseCase {
  calls: Array<{
    gameSessionId: string;
    ownerAgentId: string;
    bankerAgentId: string;
    amount: string;
  }> = [];

  async execute(input: {
    gameSessionId: string;
    ownerAgentId: string;
    bankerAgentId: string;
    amount: string;
  }) {
    this.calls.push(input);
    return createSession();
  }
}

class RecordingOpenMarketPositionUseCase {
  calls: Array<{
    gameSessionId: string;
    ownerAgentId: string;
    opportunityId: string;
    amount: string;
  }> = [];

  async execute(input: {
    gameSessionId: string;
    ownerAgentId: string;
    opportunityId: string;
    amount: string;
  }) {
    this.calls.push(input);
    return createSession();
  }
}

class FailingOpenMarketPositionUseCase {
  async execute(): Promise<never> {
    throw new Error('database write failed');
  }
}

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

describe('AgentActionExecutor', () => {
  it('persists a private message action and message', async () => {
    const actionRepository = new InMemoryAgentActionRepository();
    const messageRepository = new InMemoryAgentMessageRepository();
    const executor = new AgentActionExecutor(
      messageRepository,
      actionRepository,
      new RecordingPlaceFundsWithBankerUseCase() as never,
      new RecordingRedeemFundsFromBankerUseCase() as never,
    );

    const result = await executor.execute({
      session: createSession(),
      agentId: 'agent-1',
      turnNumber: 2,
      action: {
        type: 'send_private_message',
        recipientAgentId: 'agent-2',
        content: 'Treasury balances are tracked.',
      },
      recipientAgentId: 'agent-2',
    });

    expect(result.savedAction).toMatchObject({
      actionType: 'send_private_message',
      recipientAgentId: 'agent-2',
      content: 'Treasury balances are tracked.',
    });
    expect(result.savedMessage).toMatchObject({
      senderAgentId: 'agent-1',
      recipientAgentId: 'agent-2',
      visibility: 'private',
      content: 'Treasury balances are tracked.',
    });
  });

  it('executes custody placement through the custody use case', async () => {
    const placeFundsWithBankerUseCase =
      new RecordingPlaceFundsWithBankerUseCase();
    const executor = new AgentActionExecutor(
      new InMemoryAgentMessageRepository(),
      new InMemoryAgentActionRepository(),
      placeFundsWithBankerUseCase as never,
      new RecordingRedeemFundsFromBankerUseCase() as never,
      new RecordingOpenMarketPositionUseCase() as never,
    );

    const result = await executor.execute({
      session: createSession(),
      agentId: 'agent-2',
      turnNumber: 2,
      action: {
        type: 'place_funds_with_banker',
        recipientAgentId: 'agent-1',
        amount: '10.0000',
      },
      recipientAgentId: 'agent-1',
    });

    expect(placeFundsWithBankerUseCase.calls).toEqual([
      {
        gameSessionId: 'game-1',
        ownerAgentId: 'agent-2',
        bankerAgentId: 'agent-1',
        amount: '10.0000',
      },
    ]);
    expect(result.savedAction).toMatchObject({
      actionType: 'place_funds_with_banker',
      amount: '10.0000',
      recipientAgentId: 'agent-1',
    });
    expect(result.savedMessage).toBeUndefined();
  });

  it('executes custody redemption through the custody use case', async () => {
    const redeemFundsFromBankerUseCase =
      new RecordingRedeemFundsFromBankerUseCase();
    const executor = new AgentActionExecutor(
      new InMemoryAgentMessageRepository(),
      new InMemoryAgentActionRepository(),
      new RecordingPlaceFundsWithBankerUseCase() as never,
      redeemFundsFromBankerUseCase as never,
      new RecordingOpenMarketPositionUseCase() as never,
    );

    const result = await executor.execute({
      session: createSession(),
      agentId: 'agent-2',
      turnNumber: 3,
      action: {
        type: 'redeem_funds_from_banker',
        recipientAgentId: 'agent-1',
        amount: '2.5000',
      },
      recipientAgentId: 'agent-1',
    });

    expect(redeemFundsFromBankerUseCase.calls).toEqual([
      {
        gameSessionId: 'game-1',
        ownerAgentId: 'agent-2',
        bankerAgentId: 'agent-1',
        amount: '2.5000',
      },
    ]);
    expect(result.savedAction).toMatchObject({
      actionType: 'redeem_funds_from_banker',
      amount: '2.5000',
      recipientAgentId: 'agent-1',
    });
    expect(result.savedMessage).toBeUndefined();
  });

  it('executes market position opens through the market use case', async () => {
    const openMarketPositionUseCase = new RecordingOpenMarketPositionUseCase();
    const executor = new AgentActionExecutor(
      new InMemoryAgentMessageRepository(),
      new InMemoryAgentActionRepository(),
      new RecordingPlaceFundsWithBankerUseCase() as never,
      new RecordingRedeemFundsFromBankerUseCase() as never,
      openMarketPositionUseCase as never,
    );

    const result = await executor.execute({
      session: createSession(),
      agentId: 'agent-2',
      turnNumber: 1,
      action: {
        type: 'open_market_position',
        opportunityId: 'opp-risky',
        amount: '5.0000',
      },
      recipientAgentId: null,
    });

    expect(openMarketPositionUseCase.calls).toEqual([
      {
        gameSessionId: 'game-1',
        ownerAgentId: 'agent-2',
        opportunityId: 'opp-risky',
        amount: '5.0000',
      },
    ]);
    expect(result.savedAction).toMatchObject({
      actionType: 'open_market_position',
      amount: '5.0000',
      content: 'opp-risky',
    });
  });

  it('rolls back persisted action state when market execution fails', async () => {
    const actionRepository = new InMemoryAgentActionRepository();
    const messageRepository = new InMemoryAgentMessageRepository();
    const executor = new AgentActionExecutor(
      messageRepository,
      actionRepository,
      new RecordingPlaceFundsWithBankerUseCase() as never,
      new RecordingRedeemFundsFromBankerUseCase() as never,
      new FailingOpenMarketPositionUseCase() as never,
    );

    await expect(
      executor.execute({
        session: createSession(),
        agentId: 'agent-2',
        turnNumber: 1,
        action: {
          type: 'open_market_position',
          opportunityId: 'opp-risky',
          amount: '5.0000',
        },
        recipientAgentId: null,
      }),
    ).rejects.toThrow('database write failed');

    expect(actionRepository.saved).toEqual([]);
    expect(messageRepository.saved).toEqual([]);
  });
});
