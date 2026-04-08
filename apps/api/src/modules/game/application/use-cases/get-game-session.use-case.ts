import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';

export interface GetGameSessionInput {
  gameSessionId: string;
}

export class GetGameSessionUseCase {
  constructor(private readonly repository: GameSessionRepositoryPort) {}

  async execute(input: GetGameSessionInput) {
    const session = await this.repository.findById(input.gameSessionId);

    if (!session) {
      throw new DomainInvariantError('Game session not found.');
    }

    return session;
  }
}
