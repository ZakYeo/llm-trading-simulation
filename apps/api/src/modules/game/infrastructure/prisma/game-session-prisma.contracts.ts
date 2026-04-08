import type {
  GameSessionPrismaMapper,
  PersistedGameSessionRecord,
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
