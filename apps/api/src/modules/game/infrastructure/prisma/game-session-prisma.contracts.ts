import type {
  GameSessionPrismaMapper,
  PersistedGameSessionRecord,
} from './game-session-prisma.mapper.js';

export interface PrismaGameSessionDelegate {
  create(args: {
    data: ReturnType<typeof GameSessionPrismaMapper.toCreateInput>;
  }): Promise<unknown>;
  update(args: {
    where: { id: string };
    data: ReturnType<typeof GameSessionPrismaMapper.toUpdateInput>;
  }): Promise<unknown>;
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
      currentRound?: true;
    };
  }): Promise<PersistedGameSessionRecord | null>;
}

export interface PrismaAgentDelegate {
  deleteMany(args: { where: { gameSessionId: string } }): Promise<unknown>;
  create(args: {
    data: ReturnType<
      typeof GameSessionPrismaMapper.toAgentCreateInputs
    >[number];
  }): Promise<unknown>;
}

export interface PrismaGameRoundDelegate {
  createMany(args: {
    data: ReturnType<typeof GameSessionPrismaMapper.toRoundCreateManyInput>;
    skipDuplicates?: boolean;
  }): Promise<unknown>;
}

export interface PrismaClientLike {
  gameSession: PrismaGameSessionDelegate;
  agent: PrismaAgentDelegate;
  gameRound: PrismaGameRoundDelegate;
  $transaction<T>(callback: (tx: PrismaClientLike) => Promise<T>): Promise<T>;
}
