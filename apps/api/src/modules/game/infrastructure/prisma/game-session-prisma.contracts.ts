import type {
  GameSessionPrismaMapper,
  PersistedGameSessionRecord,
} from './game-session-prisma.mapper.js';
import type {
  CustodyAccrualHistoryRecord,
  CustodyPlacementHistoryRecord,
  CustodyRedemptionHistoryRecord,
  DepositHistoryRecord,
  TransferHistoryRecord,
  WithdrawalHistoryRecord,
} from '../../application/ports/game-session-repository.port.js';

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
      bankerCustodyPositions?: true;
    };
    select?: {
      id: true;
      currentRound?: true;
    };
  }): Promise<PersistedGameSessionRecord | null>;
}

export interface PrismaAgentDelegate {
  deleteMany(args: {
    where: {
      gameSessionId: string;
      id?: {
        notIn: string[];
      };
    };
  }): Promise<unknown>;
  create(args: {
    data: ReturnType<
      typeof GameSessionPrismaMapper.toAgentCreateInputs
    >[number];
  }): Promise<unknown>;
  upsert(
    args: ReturnType<typeof GameSessionPrismaMapper.toAgentUpsertInput>,
  ): Promise<unknown>;
}

export interface PrismaGameRoundDelegate {
  createMany(args: {
    data: ReturnType<typeof GameSessionPrismaMapper.toRoundCreateManyInput>;
    skipDuplicates?: boolean;
  }): Promise<unknown>;
}

export interface PrismaTransferDelegate {
  create(args: { data: TransferHistoryRecord }): Promise<unknown>;
}

export interface PrismaBankerCustodyPositionDelegate {
  deleteMany(args: {
    where: {
      gameSessionId: string;
    };
  }): Promise<unknown>;
  createMany(args: {
    data: ReturnType<
      typeof GameSessionPrismaMapper.toBankerCustodyPositionCreateManyInput
    >;
  }): Promise<unknown>;
}

export interface PrismaDepositDelegate {
  create(args: { data: DepositHistoryRecord }): Promise<unknown>;
}

export interface PrismaWithdrawalDelegate {
  create(args: { data: WithdrawalHistoryRecord }): Promise<unknown>;
}

export interface PrismaCustodyPlacementDelegate {
  create(args: { data: CustodyPlacementHistoryRecord }): Promise<unknown>;
}

export interface PrismaCustodyRedemptionDelegate {
  create(args: { data: CustodyRedemptionHistoryRecord }): Promise<unknown>;
}

export interface PrismaCustodyAccrualDelegate {
  createMany(args: { data: CustodyAccrualHistoryRecord[] }): Promise<unknown>;
}

export interface PrismaClientLike {
  gameSession: PrismaGameSessionDelegate;
  agent: PrismaAgentDelegate;
  gameRound: PrismaGameRoundDelegate;
  transfer: PrismaTransferDelegate;
  deposit: PrismaDepositDelegate;
  withdrawal: PrismaWithdrawalDelegate;
  custodyPlacement: PrismaCustodyPlacementDelegate;
  custodyRedemption: PrismaCustodyRedemptionDelegate;
  custodyAccrual: PrismaCustodyAccrualDelegate;
  bankerCustodyPosition: PrismaBankerCustodyPositionDelegate;
  $transaction<T>(callback: (tx: PrismaClientLike) => Promise<T>): Promise<T>;
}
