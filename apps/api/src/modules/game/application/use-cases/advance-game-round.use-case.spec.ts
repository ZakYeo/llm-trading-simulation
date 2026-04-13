import { describe, expect, it } from 'vitest';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { BankerCustodyPosition } from '../../domain/entities/banker-custody-position.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import type {
  GameSessionHistoryRecord,
  GameSessionRepositoryPort,
} from '../ports/game-session-repository.port.js';
import { AdvanceGameRoundUseCase } from './advance-game-round.use-case.js';

class InMemoryGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private session: GameSession | null) {}

  saved: GameSession[] = [];

  async save(
    session: GameSession,
    history: GameSessionHistoryRecord[] = [],
  ): Promise<void> {
    void history;
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
  it('advances the round and accrues interest only for banker custody positions', async () => {
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
            ),
          }),
          new GameAgent({
            id: 'agent-2',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('75.0000')),
            depositAccount: DepositAccount.restore(
              Money.fromDecimal('25.0000'),
            ),
          }),
        ],
        bankerCustodyPositions: [
          new BankerCustodyPosition({
            bankerAgentId: 'agent-1',
            ownerAgentId: 'agent-2',
            principal: Money.fromDecimal('30.0000'),
            accruedInterest: Money.zero(),
          }),
        ],
      }),
    );

    const useCase = new AdvanceGameRoundUseCase(repository);
    const session = await useCase.execute({
      gameSessionId: 'game-1',
      interestRateBps: 250,
    });

    expect(session.status).toBe('active');
    expect(session.currentRound).toBe(1);
    expect(session.agents[0]?.balance.available.toDecimal()).toBe('80.7500');
    expect(session.agents[0]?.depositAccount.principal.toDecimal()).toBe(
      '20.0000',
    );
    expect(session.agents[0]?.depositAccount.accruedInterest.toDecimal()).toBe(
      '0.0000',
    );
    expect(session.agents[1]?.depositAccount.principal.toDecimal()).toBe(
      '25.0000',
    );
    expect(session.agents[1]?.depositAccount.accruedInterest.toDecimal()).toBe(
      '0.0000',
    );
    expect(session.bankerCustodyPositions[0]?.principal.toDecimal()).toBe(
      '30.0000',
    );
    expect(session.bankerCustodyPositions[0]?.accruedInterest.toDecimal()).toBe(
      '0.7500',
    );
    expect(repository.saved).toHaveLength(1);
  });

  it('uses the configured default interest rate when the request omits one', async () => {
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
            depositAccount: DepositAccount.open(),
          }),
          new GameAgent({
            id: 'agent-2',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('75.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
        bankerCustodyPositions: [
          new BankerCustodyPosition({
            bankerAgentId: 'agent-1',
            ownerAgentId: 'agent-2',
            principal: Money.fromDecimal('30.0000'),
            accruedInterest: Money.zero(),
          }),
        ],
      }),
    );

    const useCase = new AdvanceGameRoundUseCase(repository, 300);
    const session = await useCase.execute({
      gameSessionId: 'game-1',
    });

    expect(session.currentRound).toBe(1);
    expect(session.agents[0]?.balance.available.toDecimal()).toBe('80.9000');
    expect(session.bankerCustodyPositions[0]?.accruedInterest.toDecimal()).toBe(
      '0.9000',
    );
  });

  it('fails when the target game session does not exist', async () => {
    const repository = new InMemoryGameSessionRepository(null);
    const useCase = new AdvanceGameRoundUseCase(repository);

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
    const useCase = new AdvanceGameRoundUseCase(repository);

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        interestRateBps: 250,
      }),
    ).rejects.toThrow(DomainInvariantError);
  });

  it('fails when the configured default interest rate is negative', async () => {
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
    const useCase = new AdvanceGameRoundUseCase(repository, -1);

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
      }),
    ).rejects.toThrow('Default interest rate cannot be negative.');
  });
});
