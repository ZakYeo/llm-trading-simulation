import type { GameSession } from '../../domain/entities/game-session.js';

export interface GameSessionRepositoryPort {
  save(session: GameSession): Promise<void>;
  findById(id: string): Promise<GameSession | null>;
}
