import { describe, expect, it } from 'vitest';

import type { AgentRole } from '@llm-sim/shared-types';

import type { IdGeneratorPort } from '../../../shared/application/ports/id-generator.port.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { GameSession } from '../../domain/entities/game-session.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';
import { CreateGameSessionUseCase } from './create-game-session.use-case.js';

class InMemoryGameSessionRepository implements GameSessionRepositoryPort {
  saved: GameSession[] = [];

  async save(session: GameSession): Promise<void> {
    this.saved.push(session);
  }

  async findById(id: string): Promise<GameSession | null> {
    return this.saved.find((session) => session.id === id) ?? null;
  }
}

class SequenceIdGenerator implements IdGeneratorPort {
  private index = 0;

  constructor(private readonly values: string[]) {}

  next(): string {
    const value = this.values[this.index];

    if (!value) {
      throw new Error('No more ids configured for test.');
    }

    this.index += 1;
    return value;
  }
}

describe('CreateGameSessionUseCase', () => {
  const agentRoles: AgentRole[] = [
    'banker',
    'analyst',
    'lawyer',
    'influencer',
    'trader',
  ];

  it('creates a setup game session with funded agents and empty deposit accounts', async () => {
    const repository = new InMemoryGameSessionRepository();
    const idGenerator = new SequenceIdGenerator([
      'agent-1',
      'agent-2',
      'agent-3',
      'agent-4',
      'agent-5',
      'game-1',
    ]);

    const useCase = new CreateGameSessionUseCase(repository, idGenerator);

    const session = await useCase.execute({
      name: 'Founders Table',
      initialBalance: '100.0000',
      agents: agentRoles.map((role, index) => ({
        name: `Agent ${index + 1}`,
        role,
      })),
    });

    expect(session.id).toBe('game-1');
    expect(session.status).toBe('setup');
    expect(session.currentRound).toBe(0);
    expect(session.agents).toHaveLength(5);
    expect(
      session.agents.map((agent) => ({
        id: agent.id,
        role: agent.role,
        available: agent.balance.available.toDecimal(),
        reserved: agent.balance.reserved.toDecimal(),
        principal: agent.depositAccount.principal.toDecimal(),
        accrued: agent.depositAccount.accruedInterest.toDecimal(),
      })),
    ).toEqual([
      {
        id: 'agent-1',
        role: 'banker',
        available: '100.0000',
        reserved: '0.0000',
        principal: '0.0000',
        accrued: '0.0000',
      },
      {
        id: 'agent-2',
        role: 'analyst',
        available: '100.0000',
        reserved: '0.0000',
        principal: '0.0000',
        accrued: '0.0000',
      },
      {
        id: 'agent-3',
        role: 'lawyer',
        available: '100.0000',
        reserved: '0.0000',
        principal: '0.0000',
        accrued: '0.0000',
      },
      {
        id: 'agent-4',
        role: 'influencer',
        available: '100.0000',
        reserved: '0.0000',
        principal: '0.0000',
        accrued: '0.0000',
      },
      {
        id: 'agent-5',
        role: 'trader',
        available: '100.0000',
        reserved: '0.0000',
        principal: '0.0000',
        accrued: '0.0000',
      },
    ]);
    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0]).toBe(session);
  });

  it('rejects sessions that do not contain the five MVP roles exactly once', async () => {
    const repository = new InMemoryGameSessionRepository();
    const idGenerator = new SequenceIdGenerator([
      'agent-1',
      'agent-2',
      'agent-3',
      'agent-4',
      'game-1',
    ]);
    const useCase = new CreateGameSessionUseCase(repository, idGenerator);

    await expect(
      useCase.execute({
        name: 'Broken Table',
        initialBalance: '100.0000',
        agents: agentRoles.slice(0, 4).map((role, index) => ({
          name: `Agent ${index + 1}`,
          role,
        })),
      }),
    ).rejects.toThrow(DomainInvariantError);
  });

  it('rejects non-positive initial balances', async () => {
    const repository = new InMemoryGameSessionRepository();
    const idGenerator = new SequenceIdGenerator(['unused-id']);
    const useCase = new CreateGameSessionUseCase(repository, idGenerator);

    await expect(
      useCase.execute({
        name: 'Zero Table',
        initialBalance: '0.0000',
        agents: agentRoles.map((role, index) => ({
          name: `Agent ${index + 1}`,
          role,
        })),
      }),
    ).rejects.toThrow(DomainInvariantError);
  });
});
