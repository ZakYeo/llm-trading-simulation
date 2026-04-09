import { describe, expect, it } from 'vitest';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { LedgerService } from '../../domain/services/ledger.service.js';
import type {
  GameSessionHistoryRecord,
  GameSessionRepositoryPort,
} from '../ports/game-session-repository.port.js';
import { DepositToBankUseCase } from './deposit-to-bank.use-case.js';
import { WithdrawFromBankUseCase } from './withdraw-from-bank.use-case.js';

class InMemoryGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private session: GameSession | null) {}

  saved: GameSession[] = [];
  deposits: Array<{ gameSessionId: string; agentId: string; amount: string }> =
    [];
  withdrawals: Array<{
    gameSessionId: string;
    agentId: string;
    amount: string;
  }> = [];

  async save(
    session: GameSession,
    history: GameSessionHistoryRecord[] = [],
  ): Promise<void> {
    this.saved.push(session);
    this.session = session;
    for (const record of history) {
      if (record.type === 'deposit') {
        this.deposits.push(record);
      }

      if (record.type === 'withdrawal') {
        this.withdrawals.push(record);
      }
    }
  }

  async findById(id: string): Promise<GameSession | null> {
    if (this.session?.id === id) {
      return this.session;
    }

    return null;
  }
}

describe('Bank funds use cases', () => {
  it('deposits liquid funds into the bank account for an agent', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('100.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
      }),
    );

    const useCase = new DepositToBankUseCase(repository, new LedgerService());
    const session = await useCase.execute({
      gameSessionId: 'game-1',
      agentId: 'agent-1',
      amount: '30.0000',
    });

    expect(session.agents[0]?.balance.available.toDecimal()).toBe('70.0000');
    expect(session.agents[0]?.depositAccount.principal.toDecimal()).toBe(
      '30.0000',
    );
    expect(repository.saved).toHaveLength(1);
    expect(repository.deposits).toEqual([
      {
        type: 'deposit',
        gameSessionId: 'game-1',
        agentId: 'agent-1',
        amount: '30.0000',
      },
    ]);
  });

  it('withdraws funds from the bank account back into liquid balance', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('50.0000')),
            depositAccount: DepositAccount.restore(
              Money.fromDecimal('20.0000'),
              Money.fromDecimal('5.0000'),
            ),
          }),
        ],
      }),
    );

    const useCase = new WithdrawFromBankUseCase(
      repository,
      new LedgerService(),
    );
    const session = await useCase.execute({
      gameSessionId: 'game-1',
      agentId: 'agent-1',
      amount: '15.0000',
    });

    expect(session.agents[0]?.balance.available.toDecimal()).toBe('65.0000');
    expect(session.agents[0]?.depositAccount.principal.toDecimal()).toBe(
      '10.0000',
    );
    expect(session.agents[0]?.depositAccount.accruedInterest.toDecimal()).toBe(
      '0.0000',
    );
    expect(repository.saved).toHaveLength(1);
    expect(repository.withdrawals).toEqual([
      {
        type: 'withdrawal',
        gameSessionId: 'game-1',
        agentId: 'agent-1',
        amount: '15.0000',
      },
    ]);
  });

  it('fails when the target game session does not exist', async () => {
    const repository = new InMemoryGameSessionRepository(null);
    const useCase = new DepositToBankUseCase(repository, new LedgerService());

    await expect(
      useCase.execute({
        gameSessionId: 'missing',
        agentId: 'agent-1',
        amount: '10.0000',
      }),
    ).rejects.toThrow(DomainInvariantError);
  });
});
