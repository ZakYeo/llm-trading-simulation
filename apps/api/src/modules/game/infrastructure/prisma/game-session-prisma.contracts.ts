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

type TransferCreateData = Omit<TransferHistoryRecord, 'type'>;
type DepositCreateData = Omit<DepositHistoryRecord, 'type'>;
type WithdrawalCreateData = Omit<WithdrawalHistoryRecord, 'type'>;
type CustodyPlacementCreateData = Omit<CustodyPlacementHistoryRecord, 'type'>;
type CustodyRedemptionCreateData = Omit<CustodyRedemptionHistoryRecord, 'type'>;
type CustodyAccrualCreateData = Omit<CustodyAccrualHistoryRecord, 'type'>;

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
  create(args: { data: TransferCreateData }): Promise<unknown>;
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
  create(args: { data: DepositCreateData }): Promise<unknown>;
}

export interface PrismaWithdrawalDelegate {
  create(args: { data: WithdrawalCreateData }): Promise<unknown>;
}

export interface PrismaCustodyPlacementDelegate {
  create(args: { data: CustodyPlacementCreateData }): Promise<unknown>;
}

export interface PrismaCustodyRedemptionDelegate {
  create(args: { data: CustodyRedemptionCreateData }): Promise<unknown>;
}

export interface PrismaCustodyAccrualDelegate {
  createMany(args: { data: CustodyAccrualCreateData[] }): Promise<unknown>;
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
