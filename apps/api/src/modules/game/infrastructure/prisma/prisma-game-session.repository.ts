import type { GameSessionRepositoryPort } from '../../application/ports/game-session-repository.port.js';
import type { GameSession } from '../../domain/entities/game-session.js';
import {
  GameSessionPrismaMapper,
  type PersistedGameSessionRecord,
} from './game-session-prisma.mapper.js';

export interface PrismaGameSessionDelegate {
  upsert(args: {
    where: { id: string };
    create: ReturnType<typeof GameSessionPrismaMapper.toCreateInput>;
    update: {
      name: string;
      status: 'SETUP' | 'ACTIVE' | 'SETTLEMENT' | 'COMPLETED' | 'FAILED';
      currentRound: number;
      agents: {
        deleteMany: Record<string, never>;
        create: ReturnType<
          typeof GameSessionPrismaMapper.toCreateInput
        >['agents']['create'];
      };
    };
  }): Promise<void>;
  findUnique(args: {
    where: { id: string };
    include: {
      agents: {
        include: {
          balance: true;
          depositAccount: true;
        };
      };
    };
  }): Promise<PersistedGameSessionRecord | null>;
}

export interface PrismaClientLike {
  gameSession: PrismaGameSessionDelegate;
}

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
