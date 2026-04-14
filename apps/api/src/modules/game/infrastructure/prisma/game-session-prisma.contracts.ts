import type {
  GameSessionPrismaMapper,
  PersistedGameSessionRecord,
} from './game-session-prisma.mapper.js';
import type {
  CustodyAccrualHistoryRecord,
  CustodyPlacementHistoryRecord,
  CustodyRedemptionHistoryRecord,
  DepositHistoryRecord,
  MarketPositionOpenedHistoryRecord,
  MarketPositionSettledHistoryRecord,
  TransferHistoryRecord,
  WithdrawalHistoryRecord,
} from '../../application/ports/game-session-repository.port.js';

type TransferCreateData = Omit<TransferHistoryRecord, 'type'>;
type DepositCreateData = Omit<DepositHistoryRecord, 'type'>;
type WithdrawalCreateData = Omit<WithdrawalHistoryRecord, 'type'>;
type CustodyPlacementCreateData = Omit<CustodyPlacementHistoryRecord, 'type'>;
type CustodyRedemptionCreateData = Omit<CustodyRedemptionHistoryRecord, 'type'>;
type CustodyAccrualCreateData = Omit<CustodyAccrualHistoryRecord, 'type'>;
type MarketPositionOpenedCreateData = Omit<
  MarketPositionOpenedHistoryRecord,
  'type'
>;
type MarketPositionSettledCreateData = Omit<
  MarketPositionSettledHistoryRecord,
  'type'
>;

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
      marketOpportunities?: true;
      marketPositions?: true;
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
  findMany(args: {
    where: {
      gameSessionId: string;
    };
    select: {
      bankerAgentId: true;
      ownerAgentId: true;
    };
  }): Promise<Array<{ bankerAgentId: string; ownerAgentId: string }>>;
  deleteMany(args: {
    where: {
      gameSessionId: string;
      OR?: Array<{
        bankerAgentId: string;
        ownerAgentId: string;
      }>;
    };
  }): Promise<unknown>;
  upsert(args: {
    where: {
      gameSessionId_bankerAgentId_ownerAgentId: {
        gameSessionId: string;
        bankerAgentId: string;
        ownerAgentId: string;
      };
    };
    create: ReturnType<
      typeof GameSessionPrismaMapper.toBankerCustodyPositionCreateManyInput
    >[number];
    update: {
      principal: string;
      accrued: string;
    };
  }): Promise<unknown>;
}

export interface PrismaMarketOpportunityDelegate {
  findMany(args: {
    where: {
      gameSessionId: string;
    };
    select: {
      id: true;
    };
  }): Promise<Array<{ id: string }>>;
  deleteMany(args: {
    where: {
      gameSessionId: string;
      id?: {
        in: string[];
      };
    };
  }): Promise<unknown>;
  upsert(args: {
    where: {
      id: string;
    };
    create: ReturnType<
      typeof GameSessionPrismaMapper.toMarketOpportunityCreateManyInput
    >[number];
    update: Omit<
      ReturnType<
        typeof GameSessionPrismaMapper.toMarketOpportunityCreateManyInput
      >[number],
      'id' | 'gameSessionId'
    >;
  }): Promise<unknown>;
}

export interface PrismaMarketPositionDelegate {
  findMany(args: {
    where: {
      gameSessionId: string;
    };
    select: {
      opportunityId: true;
      ownerAgentId: true;
    };
  }): Promise<Array<{ opportunityId: string; ownerAgentId: string }>>;
  deleteMany(args: {
    where: {
      gameSessionId: string;
      OR?: Array<{
        opportunityId: string;
        ownerAgentId: string;
      }>;
    };
  }): Promise<unknown>;
  upsert(args: {
    where: {
      gameSessionId_opportunityId_ownerAgentId: {
        gameSessionId: string;
        opportunityId: string;
        ownerAgentId: string;
      };
    };
    create: ReturnType<
      typeof GameSessionPrismaMapper.toMarketPositionCreateManyInput
    >[number];
    update: Omit<
      ReturnType<
        typeof GameSessionPrismaMapper.toMarketPositionCreateManyInput
      >[number],
      'gameSessionId' | 'opportunityId' | 'ownerAgentId'
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

export interface PrismaMarketPositionOpenDelegate {
  create(args: { data: MarketPositionOpenedCreateData }): Promise<unknown>;
}

export interface PrismaMarketPositionSettlementDelegate {
  create(args: { data: MarketPositionSettledCreateData }): Promise<unknown>;
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
  marketOpportunity: PrismaMarketOpportunityDelegate;
  marketPosition: PrismaMarketPositionDelegate;
  marketPositionOpen: PrismaMarketPositionOpenDelegate;
  marketPositionSettlement: PrismaMarketPositionSettlementDelegate;
  $transaction<T>(callback: (tx: PrismaClientLike) => Promise<T>): Promise<T>;
}
