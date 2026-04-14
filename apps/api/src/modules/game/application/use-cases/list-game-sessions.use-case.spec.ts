import { describe, expect, it } from 'vitest';

import type { GameSessionSummary } from '@llm-sim/shared-types';

import type { GameSession } from '../../domain/entities/game-session.js';
import type {
  GameSessionHistoryRecord,
  GameSessionRepositoryPort,
} from '../ports/game-session-repository.port.js';
import { ListGameSessionsUseCase } from './list-game-sessions.use-case.js';

class InMemoryGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private readonly sessions: GameSessionSummary[]) {}

  async save(
    session: GameSession,
    history: GameSessionHistoryRecord[] = [],
  ): Promise<void> {
    void session;
    void history;
  }

  async findById(): Promise<GameSession | null> {
    return null;
  }

  async list(): Promise<GameSessionSummary[]> {
    return this.sessions;
  }
}

describe('ListGameSessionsUseCase', () => {
  it('returns the available game session summaries', async () => {
    const sessions: GameSessionSummary[] = [
      {
        id: 'game-2',
        name: 'Second Table',
        status: 'active',
        currentRound: 2,
      },
      {
        id: 'game-1',
        name: 'First Table',
        status: 'setup',
        currentRound: 0,
      },
    ];
    const useCase = new ListGameSessionsUseCase(
      new InMemoryGameSessionRepository(sessions),
    );

    await expect(useCase.execute()).resolves.toEqual(sessions);
  });
});
