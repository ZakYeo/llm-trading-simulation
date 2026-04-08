import { describe, expect, it } from 'vitest';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { LedgerService } from '../../domain/services/ledger.service.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';
import { AdvanceGameRoundUseCase } from './advance-game-round.use-case.js';

class InMemoryGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private session: GameSession | null) {}

  saved: GameSession[] = [];

  async save(session: GameSession): Promise<void> {
    this.saved.push(session);
    this.session = session;
  }

  async findById(id: string): Promise<GameSession | null> {
    if (this.session?.id === id) {
      return this.session;
    }

    return null;
  }
}

describe('AdvanceGameRoundUseCase', () => {
  it('advances the round and accrues interest on deposited principal', async () => {
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
            balance: AccountBalance.open(Money.fromDecimal('80.0000')),
            depositAccount: DepositAccount.restore(
              Money.fromDecimal('20.0000'),
              Money.zero(),
            ),
          }),
        ],
      }),
    );

    const useCase = new AdvanceGameRoundUseCase(
      repository,
      new LedgerService(),
    );
    const session = await useCase.execute({
      gameSessionId: 'game-1',
      interestRateBps: 250,
    });

    expect(session.status).toBe('active');
    expect(session.currentRound).toBe(1);
    expect(session.agents[0]?.depositAccount.principal.toDecimal()).toBe(
      '20.0000',
    );
    expect(session.agents[0]?.depositAccount.accruedInterest.toDecimal()).toBe(
      '0.5000',
    );
    expect(repository.saved).toHaveLength(1);
  });

  it('fails when the target game session does not exist', async () => {
    const repository = new InMemoryGameSessionRepository(null);
    const useCase = new AdvanceGameRoundUseCase(
      repository,
      new LedgerService(),
    );

    await expect(
      useCase.execute({
        gameSessionId: 'missing',
        interestRateBps: 250,
      }),
    ).rejects.toThrow(DomainInvariantError);
  });

  it('fails when attempting to advance a non-runnable session state', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'completed',
        currentRound: 3,
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
    const useCase = new AdvanceGameRoundUseCase(
      repository,
      new LedgerService(),
    );

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        interestRateBps: 250,
      }),
    ).rejects.toThrow(DomainInvariantError);
  });
});
