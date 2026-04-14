import { describe, expect, it } from 'vitest';
import type { GameSessionSummary } from '@llm-sim/shared-types';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { BankerCustodyPosition } from '../../domain/entities/banker-custody-position.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { LedgerService } from '../../domain/services/ledger.service.js';
import type {
  GameSessionHistoryRecord,
  GameSessionRepositoryPort,
} from '../ports/game-session-repository.port.js';
import { RedeemFundsFromBankerUseCase } from './redeem-funds-from-banker.use-case.js';

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
    return this.session?.id === id ? this.session : null;
  }

  async list(): Promise<GameSessionSummary[]> {
    return this.session
      ? [
          {
            id: this.session.id,
            name: this.session.name,
            status: this.session.status,
            currentRound: this.session.currentRound,
          },
        ]
      : [];
  }
}

describe('RedeemFundsFromBankerUseCase', () => {
  it('returns custodial funds from the banker back to the owner', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'active',
        currentRound: 1,
        agents: [
          new GameAgent({
            id: 'banker-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('130.0000')),
            depositAccount: DepositAccount.open(),
          }),
          new GameAgent({
            id: 'trader-1',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('55.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
        bankerCustodyPositions: [
          new BankerCustodyPosition({
            bankerAgentId: 'banker-1',
            ownerAgentId: 'trader-1',
            principal: Money.fromDecimal('25.0000'),
            accruedInterest: Money.fromDecimal('1.0000'),
          }),
        ],
      }),
    );

    const useCase = new RedeemFundsFromBankerUseCase(
      repository,
      new LedgerService(),
    );
    const session = await useCase.execute({
      gameSessionId: 'game-1',
      ownerAgentId: 'trader-1',
      bankerAgentId: 'banker-1',
      amount: '6.0000',
    });

    expect(session.agents[0]?.balance.available.toDecimal()).toBe('124.0000');
    expect(session.agents[1]?.balance.available.toDecimal()).toBe('61.0000');
    expect(session.bankerCustodyPositions[0]?.principal.toDecimal()).toBe(
      '20.0000',
    );
    expect(session.bankerCustodyPositions[0]?.accruedInterest.toDecimal()).toBe(
      '0.0000',
    );
    expect(repository.saved).toHaveLength(1);
  });

  it('fails when redeeming more than the owner custody balance', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'active',
        currentRound: 1,
        agents: [
          new GameAgent({
            id: 'banker-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('130.0000')),
            depositAccount: DepositAccount.open(),
          }),
          new GameAgent({
            id: 'trader-1',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('55.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
        bankerCustodyPositions: [
          new BankerCustodyPosition({
            bankerAgentId: 'banker-1',
            ownerAgentId: 'trader-1',
            principal: Money.fromDecimal('25.0000'),
            accruedInterest: Money.zero(),
          }),
        ],
      }),
    );

    const useCase = new RedeemFundsFromBankerUseCase(
      repository,
      new LedgerService(),
    );

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        ownerAgentId: 'trader-1',
        bankerAgentId: 'banker-1',
        amount: '30.0000',
      }),
    ).rejects.toThrow(DomainInvariantError);
  });
});
