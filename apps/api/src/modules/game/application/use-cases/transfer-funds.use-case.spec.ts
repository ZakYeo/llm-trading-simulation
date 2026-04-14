import { describe, expect, it } from 'vitest';
import type { GameSessionSummary } from '@llm-sim/shared-types';

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
import { TransferFundsUseCase } from './transfer-funds.use-case.js';

class InMemoryGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private session: GameSession | null) {}

  saved: GameSession[] = [];
  transfers: Array<{
    gameSessionId: string;
    sourceAgentId: string;
    destinationAgentId: string;
    amount: string;
  }> = [];

  async save(
    session: GameSession,
    history: GameSessionHistoryRecord[] = [],
  ): Promise<void> {
    this.saved.push(session);
    this.session = session;
    for (const record of history) {
      if (record.type === 'transfer') {
        this.transfers.push(record);
      }
    }
  }

  async findById(id: string): Promise<GameSession | null> {
    if (this.session?.id === id) {
      return this.session;
    }

    return null;
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

describe('TransferFundsUseCase', () => {
  it('transfers liquid funds between two agents in the same game session', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-1',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('100.0000')),
            depositAccount: DepositAccount.open(),
          }),
          new GameAgent({
            id: 'agent-2',
            name: 'Analyst Bot',
            role: 'analyst',
            balance: AccountBalance.open(Money.fromDecimal('25.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
      }),
    );

    const useCase = new TransferFundsUseCase(repository, new LedgerService());
    const session = await useCase.execute({
      gameSessionId: 'game-1',
      sourceAgentId: 'agent-1',
      destinationAgentId: 'agent-2',
      amount: '40.0000',
    });

    expect(session.agents[0]?.balance.available.toDecimal()).toBe('60.0000');
    expect(session.agents[1]?.balance.available.toDecimal()).toBe('65.0000');
    expect(repository.saved).toHaveLength(1);
    expect(repository.transfers).toEqual([
      {
        type: 'transfer',
        gameSessionId: 'game-1',
        sourceAgentId: 'agent-1',
        destinationAgentId: 'agent-2',
        amount: '40.0000',
      },
    ]);
  });

  it('fails when either agent is missing from the game session', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-1',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('100.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
      }),
    );

    const useCase = new TransferFundsUseCase(repository, new LedgerService());

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        sourceAgentId: 'agent-1',
        destinationAgentId: 'missing',
        amount: '10.0000',
      }),
    ).rejects.toThrow(DomainInvariantError);
  });

  it('fails when source and destination are the same agent', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-1',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('100.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
      }),
    );

    const useCase = new TransferFundsUseCase(repository, new LedgerService());

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        sourceAgentId: 'agent-1',
        destinationAgentId: 'agent-1',
        amount: '10.0000',
      }),
    ).rejects.toThrow(DomainInvariantError);
  });
});
