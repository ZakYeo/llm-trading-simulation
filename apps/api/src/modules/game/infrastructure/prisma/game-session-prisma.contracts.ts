import type {
  GameSessionPrismaMapper,
  PersistedGameSessionRecord,
} from './game-session-prisma.mapper.js';

export interface PrismaGameSessionDelegate {
  create(args: {
    data: ReturnType<typeof GameSessionPrismaMapper.toCreateInput>;
  }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  findUnique(args: {
    where: { id: string };
    include?: {
      agents: {
        include: {
          balance: true;
          depositAccount: true;
        };
      };
    };
    select?: {
      id: true;
    };
  }): Promise<PersistedGameSessionRecord | null>;
}

export interface PrismaClientLike {
  gameSession: PrismaGameSessionDelegate;
}
