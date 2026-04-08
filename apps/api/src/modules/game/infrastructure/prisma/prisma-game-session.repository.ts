import type { GameSessionRepositoryPort } from '../../application/ports/game-session-repository.port.js';
import type { GameSession } from '../../domain/entities/game-session.js';
import { GameSessionPrismaMapper } from './game-session-prisma.mapper.js';
import type { PrismaClientLike } from './game-session-prisma.contracts.js';

export class PrismaGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private readonly prisma: PrismaClientLike) {}

  async save(session: GameSession): Promise<void> {
    const create = GameSessionPrismaMapper.toCreateInput(session);

    await this.prisma.gameSession.upsert({
      where: { id: session.id },
      create,
      update: {
        name: create.name,
        status: create.status,
        currentRound: create.currentRound,
        agents: {
          deleteMany: {},
          create: create.agents.create,
        },
      },
    });
  }

  async findById(id: string): Promise<GameSession | null> {
    const record = await this.prisma.gameSession.findUnique({
      where: { id },
      include: {
        agents: {
          include: {
            balance: true,
            depositAccount: true,
          },
        },
      },
    });

    if (!record) {
      return null;
    }

    return GameSessionPrismaMapper.toDomain(record);
  }
}
