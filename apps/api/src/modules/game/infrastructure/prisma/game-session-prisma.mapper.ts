import { BankerCustodyPosition } from '../../domain/entities/banker-custody-position.js';
import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { MarketOpportunity } from '../../domain/entities/market-opportunity.js';
import { MarketPosition } from '../../domain/entities/market-position.js';

export interface PersistedGameSessionRecord {
  id: string;
  name: string;
  status: 'SETUP' | 'ACTIVE' | 'SETTLEMENT' | 'COMPLETED' | 'FAILED';
  currentRound: number;
  agents: Array<{
    id: string;
    name: string;
    role: 'BANKER' | 'ANALYST' | 'LAWYER' | 'INFLUENCER' | 'TRADER';
    balance: {
      available: string | { toString(): string };
      reserved: string | { toString(): string };
    } | null;
    depositAccount: {
      principal: string | { toString(): string };
      accrued: string | { toString(): string };
    } | null;
  }>;
  bankerCustodyPositions?: Array<{
    bankerAgentId: string;
    ownerAgentId: string;
    principal: string | { toString(): string };
    accrued: string | { toString(): string };
  }>;
  marketOpportunities?: Array<{
    id: string;
    title: string;
    summary: string;
    riskLevel: 'LOW' | 'HIGH';
    listedRound: number;
    settlementRound: number;
    minCommitment: string | { toString(): string };
    maxCommitment: string | { toString(): string };
    estimatedNetReturnBps: number;
    worstCaseReturnBps: number;
    bestCaseReturnBps: number;
    resolutionReturnBps: number;
  }>;
  marketPositions?: Array<{
    opportunityId: string;
    ownerAgentId: string;
    opportunityTitle: string;
    principal: string | { toString(): string };
    entryRound: number;
    settlementRound: number;
  }>;
}

const statusToPersistence = {
  setup: 'SETUP',
  active: 'ACTIVE',
  settlement: 'SETTLEMENT',
  completed: 'COMPLETED',
  failed: 'FAILED',
} as const;

const roleToPersistence = {
  banker: 'BANKER',
  analyst: 'ANALYST',
  lawyer: 'LAWYER',
  influencer: 'INFLUENCER',
  trader: 'TRADER',
} as const;

const statusFromPersistence = {
  SETUP: 'setup',
  ACTIVE: 'active',
  SETTLEMENT: 'settlement',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

const roleFromPersistence = {
  BANKER: 'banker',
  ANALYST: 'analyst',
  LAWYER: 'lawyer',
  INFLUENCER: 'influencer',
  TRADER: 'trader',
} as const;

const marketRiskToPersistence = {
  low: 'LOW',
  high: 'HIGH',
} as const;

const marketRiskFromPersistence = {
  LOW: 'low',
  HIGH: 'high',
} as const;

function decimalLikeToString(
  value: string | { toString(): string } | undefined,
): string {
  return value?.toString() ?? '0.0000';
}

export class GameSessionPrismaMapper {
  static toCreateInput(session: GameSession) {
    return {
      id: session.id,
      name: session.name,
      status: statusToPersistence[session.status],
      currentRound: session.currentRound,
      agents: {
        create: session.agents.map((agent) =>
          GameSessionPrismaMapper.toNestedAgentCreateInput(agent),
        ),
      },
      bankerCustodyPositions: {
        create: session.bankerCustodyPositions.map((position) => ({
          bankerAgentId: position.bankerAgentId,
          ownerAgentId: position.ownerAgentId,
          principal: position.principal.toDecimal(),
          accrued: position.accruedInterest.toDecimal(),
        })),
      },
      marketOpportunities: {
        create: session.marketOpportunities.map((opportunity) => ({
          id: opportunity.id,
          title: opportunity.title,
          summary: opportunity.summary,
          riskLevel: marketRiskToPersistence[opportunity.riskLevel],
          listedRound: opportunity.listedRound,
          settlementRound: opportunity.settlementRound,
          minCommitment: opportunity.minCommitment,
          maxCommitment: opportunity.maxCommitment,
          estimatedNetReturnBps: opportunity.estimatedNetReturnBps,
          worstCaseReturnBps: opportunity.worstCaseReturnBps,
          bestCaseReturnBps: opportunity.bestCaseReturnBps,
          resolutionReturnBps: opportunity.resolutionReturnBps,
        })),
      },
      marketPositions: {
        create: session.marketPositions.map((position) => ({
          opportunityId: position.opportunityId,
          ownerAgentId: position.ownerAgentId,
          opportunityTitle: position.opportunityTitle,
          principal: position.principal.toDecimal(),
          entryRound: position.entryRound,
          settlementRound: position.settlementRound,
        })),
      },
    };
  }

  static toUpdateInput(session: GameSession) {
    return {
      name: session.name,
      status: statusToPersistence[session.status],
      currentRound: session.currentRound,
    };
  }

  static toAgentCreateInputs(session: GameSession) {
    return session.agents.map((agent) => ({
      id: agent.id,
      gameSessionId: session.id,
      name: agent.name,
      role: roleToPersistence[agent.role],
      balance: {
        create: {
          available: agent.balance.available.toDecimal(),
          reserved: agent.balance.reserved.toDecimal(),
        },
      },
      depositAccount: {
        create: {
          principal: agent.depositAccount.principal.toDecimal(),
          accrued: agent.depositAccount.accruedInterest.toDecimal(),
        },
      },
    }));
  }

  static toAgentUpsertInput(session: GameSession, agent: GameAgent) {
    return {
      where: { id: agent.id },
      create: {
        id: agent.id,
        gameSessionId: session.id,
        name: agent.name,
        role: roleToPersistence[agent.role],
        balance: {
          create: {
            available: agent.balance.available.toDecimal(),
            reserved: agent.balance.reserved.toDecimal(),
          },
        },
        depositAccount: {
          create: {
            principal: agent.depositAccount.principal.toDecimal(),
            accrued: agent.depositAccount.accruedInterest.toDecimal(),
          },
        },
      },
      update: {
        name: agent.name,
        role: roleToPersistence[agent.role],
        balance: {
          upsert: {
            create: {
              available: agent.balance.available.toDecimal(),
              reserved: agent.balance.reserved.toDecimal(),
            },
            update: {
              available: agent.balance.available.toDecimal(),
              reserved: agent.balance.reserved.toDecimal(),
            },
          },
        },
        depositAccount: {
          upsert: {
            create: {
              principal: agent.depositAccount.principal.toDecimal(),
              accrued: agent.depositAccount.accruedInterest.toDecimal(),
            },
            update: {
              principal: agent.depositAccount.principal.toDecimal(),
              accrued: agent.depositAccount.accruedInterest.toDecimal(),
            },
          },
        },
      },
    };
  }

  static toRoundCreateManyInput(gameSessionId: string, currentRound: number) {
    return Array.from({ length: currentRound }, (_, index) => ({
      gameSessionId,
      roundNumber: index + 1,
    }));
  }

  static toBankerCustodyPositionCreateManyInput(session: GameSession) {
    return session.bankerCustodyPositions.map((position) => ({
      gameSessionId: session.id,
      bankerAgentId: position.bankerAgentId,
      ownerAgentId: position.ownerAgentId,
      principal: position.principal.toDecimal(),
      accrued: position.accruedInterest.toDecimal(),
    }));
  }

  static toMarketOpportunityCreateManyInput(session: GameSession) {
    return session.marketOpportunities.map((opportunity) => ({
      id: opportunity.id,
      gameSessionId: session.id,
      title: opportunity.title,
      summary: opportunity.summary,
      riskLevel: marketRiskToPersistence[opportunity.riskLevel],
      listedRound: opportunity.listedRound,
      settlementRound: opportunity.settlementRound,
      minCommitment: opportunity.minCommitment,
      maxCommitment: opportunity.maxCommitment,
      estimatedNetReturnBps: opportunity.estimatedNetReturnBps,
      worstCaseReturnBps: opportunity.worstCaseReturnBps,
      bestCaseReturnBps: opportunity.bestCaseReturnBps,
      resolutionReturnBps: opportunity.resolutionReturnBps,
    }));
  }

  static toMarketPositionCreateManyInput(session: GameSession) {
    return session.marketPositions.map((position) => ({
      gameSessionId: session.id,
      opportunityId: position.opportunityId,
      ownerAgentId: position.ownerAgentId,
      opportunityTitle: position.opportunityTitle,
      principal: position.principal.toDecimal(),
      entryRound: position.entryRound,
      settlementRound: position.settlementRound,
    }));
  }

  private static toNestedAgentCreateInput(agent: GameAgent) {
    return {
      id: agent.id,
      name: agent.name,
      role: roleToPersistence[agent.role],
      balance: {
        create: {
          available: agent.balance.available.toDecimal(),
          reserved: agent.balance.reserved.toDecimal(),
        },
      },
      depositAccount: {
        create: {
          principal: agent.depositAccount.principal.toDecimal(),
          accrued: agent.depositAccount.accruedInterest.toDecimal(),
        },
      },
    };
  }

  static toDomain(record: PersistedGameSessionRecord): GameSession {
    return new GameSession({
      id: record.id,
      name: record.name,
      status: statusFromPersistence[record.status],
      currentRound: record.currentRound,
      agents: record.agents.map((agent) => {
        const balance = agent.balance;
        const depositAccount = agent.depositAccount;

        return new GameAgent({
          id: agent.id,
          name: agent.name,
          role: roleFromPersistence[agent.role],
          balance: AccountBalance.restore(
            Money.fromDecimal(decimalLikeToString(balance?.available)),
            Money.fromDecimal(decimalLikeToString(balance?.reserved)),
          ),
          depositAccount: DepositAccount.restore(
            Money.fromDecimal(decimalLikeToString(depositAccount?.principal)),
            Money.fromDecimal(decimalLikeToString(depositAccount?.accrued)),
          ),
        });
      }),
      bankerCustodyPositions: (record.bankerCustodyPositions ?? []).map(
        (position) =>
          new BankerCustodyPosition({
            bankerAgentId: position.bankerAgentId,
            ownerAgentId: position.ownerAgentId,
            principal: Money.fromDecimal(
              decimalLikeToString(position.principal),
            ),
            accruedInterest: Money.fromDecimal(
              decimalLikeToString(position.accrued),
            ),
          }),
      ),
      marketOpportunities: (record.marketOpportunities ?? []).map(
        (opportunity) =>
          new MarketOpportunity({
            id: opportunity.id,
            title: opportunity.title,
            summary: opportunity.summary,
            riskLevel: marketRiskFromPersistence[opportunity.riskLevel],
            listedRound: opportunity.listedRound,
            settlementRound: opportunity.settlementRound,
            minCommitment: decimalLikeToString(opportunity.minCommitment),
            maxCommitment: decimalLikeToString(opportunity.maxCommitment),
            estimatedNetReturnBps: opportunity.estimatedNetReturnBps,
            worstCaseReturnBps: opportunity.worstCaseReturnBps,
            bestCaseReturnBps: opportunity.bestCaseReturnBps,
            resolutionReturnBps: opportunity.resolutionReturnBps,
          }),
      ),
      marketPositions: (record.marketPositions ?? []).map(
        (position) =>
          new MarketPosition({
            opportunityId: position.opportunityId,
            ownerAgentId: position.ownerAgentId,
            opportunityTitle: position.opportunityTitle,
            principal: Money.fromDecimal(
              decimalLikeToString(position.principal),
            ),
            entryRound: position.entryRound,
            settlementRound: position.settlementRound,
          }),
      ),
    });
  }
}
