import { describe, expect, it } from 'vitest';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { LedgerService } from '../../domain/services/ledger.service.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';
import { PlaceFundsWithBankerUseCase } from './place-funds-with-banker.use-case.js';

class InMemoryGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private session: GameSession | null) {}

  saved: GameSession[] = [];

  async save(session: GameSession): Promise<void> {
    this.saved.push(session);
    this.session = session;
  }

  async saveWithTransfer(): Promise<void> {
    throw new Error('Not implemented in this test repository.');
  }

  async saveWithDeposit(): Promise<void> {
    throw new Error('Not implemented in this test repository.');
  }

  async saveWithWithdrawal(): Promise<void> {
    throw new Error('Not implemented in this test repository.');
  }

  async saveWithCustodyPlacement(session: GameSession): Promise<void> {
    await this.save(session);
  }

  async saveWithCustodyRedemption(): Promise<void> {
    throw new Error('Not implemented in this test repository.');
  }

  async saveWithCustodyAccruals(): Promise<void> {
    throw new Error('Not implemented in this test repository.');
  }

  async findById(id: string): Promise<GameSession | null> {
    return this.session?.id === id ? this.session : null;
  }
}

describe('PlaceFundsWithBankerUseCase', () => {
  it('moves owner funds into banker custody and records the principal position', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'banker-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('100.0000')),
            depositAccount: DepositAccount.open(),
          }),
          new GameAgent({
            id: 'trader-1',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('80.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
      }),
    );

    const useCase = new PlaceFundsWithBankerUseCase(
      repository,
      new LedgerService(),
    );
    const session = await useCase.execute({
      gameSessionId: 'game-1',
      ownerAgentId: 'trader-1',
      bankerAgentId: 'banker-1',
      amount: '25.0000',
    });

    expect(session.agents[0]?.balance.available.toDecimal()).toBe('125.0000');
    expect(session.agents[1]?.balance.available.toDecimal()).toBe('55.0000');
    expect(session.bankerCustodyPositions).toHaveLength(1);
    expect(session.bankerCustodyPositions[0]?.principal.toDecimal()).toBe(
      '25.0000',
    );
    expect(session.bankerCustodyPositions[0]?.accruedInterest.toDecimal()).toBe(
      '0.0000',
    );
    expect(repository.saved).toHaveLength(1);
  });

  it('fails when the target agent is not a banker', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'trader-1',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('80.0000')),
            depositAccount: DepositAccount.open(),
          }),
          new GameAgent({
            id: 'lawyer-1',
            name: 'Lawyer Bot',
            role: 'lawyer',
            balance: AccountBalance.open(Money.fromDecimal('80.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
      }),
    );

    const useCase = new PlaceFundsWithBankerUseCase(
      repository,
      new LedgerService(),
    );

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        ownerAgentId: 'trader-1',
        bankerAgentId: 'lawyer-1',
        amount: '25.0000',
      }),
    ).rejects.toThrow(DomainInvariantError);
  });
});
