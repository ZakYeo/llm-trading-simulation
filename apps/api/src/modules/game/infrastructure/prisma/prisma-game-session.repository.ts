import type { GameSessionRepositoryPort } from '../../application/ports/game-session-repository.port.js';
import type { GameSession } from '../../domain/entities/game-session.js';
import { GameSessionPrismaMapper } from './game-session-prisma.mapper.js';
import type { PrismaClientLike } from './game-session-prisma.contracts.js';

export class PrismaGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private readonly prisma: PrismaClientLike) {}

  async save(session: GameSession): Promise<void> {
    const data = GameSessionPrismaMapper.toCreateInput(session);
    const existing = await this.prisma.gameSession.findUnique({
      where: { id: session.id },
      select: { id: true },
    });

    if (!existing) {
      await this.prisma.gameSession.create({ data });
      return;
    }

    await this.prisma.gameSession.delete({
      where: { id: session.id },
    });
    await this.prisma.gameSession.create({ data });
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
