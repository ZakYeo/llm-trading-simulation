import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';

export class ListGameSessionsUseCase {
  constructor(private readonly repository: GameSessionRepositoryPort) {}

  async execute() {
    return this.repository.list();
  }
}
