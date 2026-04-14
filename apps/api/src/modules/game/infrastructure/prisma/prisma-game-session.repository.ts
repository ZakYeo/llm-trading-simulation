import type { GameSessionSummary } from '@llm-sim/shared-types';

import type {
  GameSessionHistoryRecord,
  GameSessionRepositoryPort,
} from '../../application/ports/game-session-repository.port.js';
import type { GameSession } from '../../domain/entities/game-session.js';
import { GameSessionPrismaMapper } from './game-session-prisma.mapper.js';
import type { PrismaClientLike } from './game-session-prisma.contracts.js';

export class PrismaGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private readonly prisma: PrismaClientLike) {}

  private static toCustodyPositionKey(position: {
    bankerAgentId: string;
    ownerAgentId: string;
  }) {
    return `${position.bankerAgentId}:${position.ownerAgentId}`;
  }

  private static toMarketPositionKey(position: {
    opportunityId: string;
    ownerAgentId: string;
  }) {
    return `${position.opportunityId}:${position.ownerAgentId}`;
  }

  private static toMarketSettlementHistoryKey(record: {
    roundNumber: number;
    opportunityId: string;
    ownerAgentId: string;
  }) {
    return `${record.roundNumber}:${record.opportunityId}:${record.ownerAgentId}`;
  }

  async save(
    session: GameSession,
    history: GameSessionHistoryRecord[] = [],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.persistSession(tx, session);

      const accruals: Array<{
        gameSessionId: string;
        roundNumber: number;
        bankerAgentId: string;
        ownerAgentId: string;
        amount: string;
      }> = [];
      const createdMarketSettlements = new Map<string, string>();
      const pendingResolutionParticipants: Array<{
        marketOpportunityResolvedId: string;
        ownerAgentId: string;
        principal: string;
        profitOrLoss: string;
        settlementHistoryKey: string;
      }> = [];

      for (const record of history) {
        switch (record.type) {
          case 'transfer':
            await tx.transfer.create({
              data: {
                gameSessionId: record.gameSessionId,
                sourceAgentId: record.sourceAgentId,
                destinationAgentId: record.destinationAgentId,
                amount: record.amount,
              },
            });
            break;
          case 'deposit':
            await tx.deposit.create({
              data: {
                gameSessionId: record.gameSessionId,
                agentId: record.agentId,
                amount: record.amount,
              },
            });
            break;
          case 'withdrawal':
            await tx.withdrawal.create({
              data: {
                gameSessionId: record.gameSessionId,
                agentId: record.agentId,
                amount: record.amount,
              },
            });
            break;
          case 'custody_placement':
            await tx.custodyPlacement.create({
              data: {
                gameSessionId: record.gameSessionId,
                roundNumber: record.roundNumber,
                bankerAgentId: record.bankerAgentId,
                ownerAgentId: record.ownerAgentId,
                amount: record.amount,
              },
            });
            break;
          case 'custody_redemption':
            await tx.custodyRedemption.create({
              data: {
                gameSessionId: record.gameSessionId,
                roundNumber: record.roundNumber,
                bankerAgentId: record.bankerAgentId,
                ownerAgentId: record.ownerAgentId,
                amount: record.amount,
              },
            });
            break;
          case 'custody_accrual':
            accruals.push({
              gameSessionId: record.gameSessionId,
              roundNumber: record.roundNumber,
              bankerAgentId: record.bankerAgentId,
              ownerAgentId: record.ownerAgentId,
              amount: record.amount,
            });
            break;
          case 'market_position_opened':
            await tx.marketPositionOpen.create({
              data: {
                gameSessionId: record.gameSessionId,
                roundNumber: record.roundNumber,
                opportunityId: record.opportunityId,
                opportunityTitle: record.opportunityTitle,
                ownerAgentId: record.ownerAgentId,
                amount: record.amount,
              },
            });
            break;
          case 'market_opportunity_listed':
            await tx.marketOpportunityListed.create({
              data: {
                gameSessionId: record.gameSessionId,
                roundNumber: record.roundNumber,
                opportunityId: record.opportunityId,
                opportunityTitle: record.opportunityTitle,
                opportunityCategory:
                  record.opportunityCategory.toUpperCase() as never,
                opportunitySummary: record.opportunitySummary,
                opportunityRiskLevel:
                  record.opportunityRiskLevel.toUpperCase() as never,
                listedRound: record.listedRound,
                settlementRound: record.settlementRound,
                minCommitment: record.minCommitment,
                maxCommitment: record.maxCommitment,
                estimatedNetReturnBps: record.estimatedNetReturnBps,
                worstCaseReturnBps: record.worstCaseReturnBps,
                bestCaseReturnBps: record.bestCaseReturnBps,
              },
            });
            break;
          case 'market_position_settled':
            {
              const settlement = await tx.marketPositionSettlement.create({
                data: {
                  gameSessionId: record.gameSessionId,
                  roundNumber: record.roundNumber,
                  opportunityId: record.opportunityId,
                  opportunityTitle: record.opportunityTitle,
                  ownerAgentId: record.ownerAgentId,
                  principal: record.principal,
                  profitOrLoss: record.profitOrLoss,
                },
              });
              createdMarketSettlements.set(
                PrismaGameSessionRepository.toMarketSettlementHistoryKey(
                  record,
                ),
                (settlement as { id: string }).id,
              );
            }
            break;
          case 'market_opportunity_resolved':
            {
              const resolvedEvent = await tx.marketOpportunityResolved.create({
                data: {
                  gameSessionId: record.gameSessionId,
                  roundNumber: record.roundNumber,
                  opportunityId: record.opportunityId,
                  opportunityTitle: record.opportunityTitle,
                  opportunityCategory:
                    record.opportunityCategory.toUpperCase() as never,
                  opportunitySummary: record.opportunitySummary,
                  opportunityRiskLevel:
                    record.opportunityRiskLevel.toUpperCase() as never,
                  listedRound: record.listedRound,
                  settlementRound: record.settlementRound,
                  minCommitment: record.minCommitment,
                  maxCommitment: record.maxCommitment,
                  estimatedNetReturnBps: record.estimatedNetReturnBps,
                  worstCaseReturnBps: record.worstCaseReturnBps,
                  bestCaseReturnBps: record.bestCaseReturnBps,
                  participantCount: record.participantCount,
                  totalPrincipal: record.totalPrincipal,
                  totalProfitOrLoss: record.totalProfitOrLoss,
                },
              });
              const participantRecords = history.filter(
                (
                  candidate,
                ): candidate is Extract<
                  GameSessionHistoryRecord,
                  { type: 'market_position_settled' }
                > =>
                  candidate.type === 'market_position_settled' &&
                  candidate.roundNumber === record.roundNumber &&
                  candidate.opportunityId === record.opportunityId,
              );
              pendingResolutionParticipants.push(
                ...participantRecords.map((participant) => ({
                  marketOpportunityResolvedId: (resolvedEvent as { id: string })
                    .id,
                  ownerAgentId: participant.ownerAgentId,
                  principal: participant.principal,
                  profitOrLoss: participant.profitOrLoss,
                  settlementHistoryKey:
                    PrismaGameSessionRepository.toMarketSettlementHistoryKey(
                      participant,
                    ),
                })),
              );
            }
            break;
        }
      }

      if (accruals.length > 0) {
        await tx.custodyAccrual.createMany({
          data: accruals,
        });
      }

      if (pendingResolutionParticipants.length > 0) {
        await tx.marketOpportunityResolutionParticipant.createMany({
          data: pendingResolutionParticipants.flatMap((participant) => {
            const marketPositionSettlementId = createdMarketSettlements.get(
              participant.settlementHistoryKey,
            );

            if (!marketPositionSettlementId) {
              return [];
            }

            return [
              {
                marketOpportunityResolvedId:
                  participant.marketOpportunityResolvedId,
                marketPositionSettlementId,
                ownerAgentId: participant.ownerAgentId,
                principal: participant.principal,
                profitOrLoss: participant.profitOrLoss,
              },
            ];
          }),
        });
      }
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
        bankerCustodyPositions: true,
        marketOpportunities: true,
        marketPositions: true,
      },
    });

    if (!record) {
      return null;
    }

    return GameSessionPrismaMapper.toDomain(record);
  }

  async list(): Promise<GameSessionSummary[]> {
    const sessions = await this.prisma.gameSession.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        currentRound: true,
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      name: session.name,
      status: session.status.toLowerCase() as GameSessionSummary['status'],
      currentRound: session.currentRound,
    }));
  }

  private async persistSession(
    tx: PrismaClientLike,
    session: GameSession,
  ): Promise<void> {
    const createData = GameSessionPrismaMapper.toCreateInput(session);
    const existing = await tx.gameSession.findUnique({
      where: { id: session.id },
      select: { id: true, currentRound: true },
    });

    if (!existing) {
      await tx.gameSession.create({ data: createData });

      const roundData = GameSessionPrismaMapper.toRoundCreateManyInput(
        session.id,
        session.currentRound,
      );

      if (roundData.length > 0) {
        await tx.gameRound.createMany({
          data: roundData,
        });
      }
      return;
    }

    await tx.gameSession.update({
      where: { id: session.id },
      data: GameSessionPrismaMapper.toUpdateInput(session),
    });
    await tx.agent.deleteMany({
      where: {
        gameSessionId: session.id,
        id: {
          notIn: session.agents.map((agent) => agent.id),
        },
      },
    });

    for (const agent of session.agents) {
      await tx.agent.upsert(
        GameSessionPrismaMapper.toAgentUpsertInput(session, agent),
      );
    }

    const bankerCustodyPositionData =
      GameSessionPrismaMapper.toBankerCustodyPositionCreateManyInput(session);
    const existingCustodyPositions = await tx.bankerCustodyPosition.findMany({
      where: {
        gameSessionId: session.id,
      },
      select: {
        bankerAgentId: true,
        ownerAgentId: true,
      },
    });
    const nextCustodyPositionKeys = new Set(
      bankerCustodyPositionData.map((position) =>
        PrismaGameSessionRepository.toCustodyPositionKey(position),
      ),
    );
    const custodyPositionsToDelete = existingCustodyPositions.filter(
      (position) =>
        !nextCustodyPositionKeys.has(
          PrismaGameSessionRepository.toCustodyPositionKey(position),
        ),
    );

    if (custodyPositionsToDelete.length > 0) {
      await tx.bankerCustodyPosition.deleteMany({
        where: {
          gameSessionId: session.id,
          OR: custodyPositionsToDelete.map((position) => ({
            bankerAgentId: position.bankerAgentId,
            ownerAgentId: position.ownerAgentId,
          })),
        },
      });
    }

    for (const position of bankerCustodyPositionData) {
      await tx.bankerCustodyPosition.upsert({
        where: {
          gameSessionId_bankerAgentId_ownerAgentId: {
            gameSessionId: session.id,
            bankerAgentId: position.bankerAgentId,
            ownerAgentId: position.ownerAgentId,
          },
        },
        create: position,
        update: {
          principal: position.principal,
          accrued: position.accrued,
        },
      });
    }

    const marketOpportunityData =
      GameSessionPrismaMapper.toMarketOpportunityCreateManyInput(session);
    const existingMarketOpportunities = await tx.marketOpportunity.findMany({
      where: {
        gameSessionId: session.id,
      },
      select: {
        id: true,
      },
    });
    const nextOpportunityIds = new Set(
      marketOpportunityData.map((opportunity) => opportunity.id),
    );
    const opportunitiesToDelete = existingMarketOpportunities
      .filter((opportunity) => !nextOpportunityIds.has(opportunity.id))
      .map((opportunity) => opportunity.id);

    if (opportunitiesToDelete.length > 0) {
      await tx.marketOpportunity.deleteMany({
        where: {
          gameSessionId: session.id,
          id: {
            in: opportunitiesToDelete,
          },
        },
      });
    }

    for (const opportunity of marketOpportunityData) {
      await tx.marketOpportunity.upsert({
        where: {
          id: opportunity.id,
        },
        create: opportunity,
        update: {
          templateId: opportunity.templateId,
          category: opportunity.category,
          title: opportunity.title,
          summary: opportunity.summary,
          riskLevel: opportunity.riskLevel,
          listedRound: opportunity.listedRound,
          settlementRound: opportunity.settlementRound,
          minCommitment: opportunity.minCommitment,
          maxCommitment: opportunity.maxCommitment,
          estimatedNetReturnBps: opportunity.estimatedNetReturnBps,
          worstCaseReturnBps: opportunity.worstCaseReturnBps,
          bestCaseReturnBps: opportunity.bestCaseReturnBps,
          resolutionReturnBps: opportunity.resolutionReturnBps,
        },
      });
    }

    const marketPositionData =
      GameSessionPrismaMapper.toMarketPositionCreateManyInput(session);
    const existingMarketPositions = await tx.marketPosition.findMany({
      where: {
        gameSessionId: session.id,
      },
      select: {
        opportunityId: true,
        ownerAgentId: true,
      },
    });
    const nextMarketPositionKeys = new Set(
      marketPositionData.map((position) =>
        PrismaGameSessionRepository.toMarketPositionKey(position),
      ),
    );
    const marketPositionsToDelete = existingMarketPositions.filter(
      (position) =>
        !nextMarketPositionKeys.has(
          PrismaGameSessionRepository.toMarketPositionKey(position),
        ),
    );

    if (marketPositionsToDelete.length > 0) {
      await tx.marketPosition.deleteMany({
        where: {
          gameSessionId: session.id,
          OR: marketPositionsToDelete.map((position) => ({
            opportunityId: position.opportunityId,
            ownerAgentId: position.ownerAgentId,
          })),
        },
      });
    }

    for (const position of marketPositionData) {
      await tx.marketPosition.upsert({
        where: {
          gameSessionId_opportunityId_ownerAgentId: {
            gameSessionId: session.id,
            opportunityId: position.opportunityId,
            ownerAgentId: position.ownerAgentId,
          },
        },
        create: position,
        update: {
          opportunityTitle: position.opportunityTitle,
          principal: position.principal,
          entryRound: position.entryRound,
          settlementRound: position.settlementRound,
        },
      });
    }

    if (session.currentRound > existing.currentRound) {
      await tx.gameRound.createMany({
        data: Array.from(
          {
            length: session.currentRound - existing.currentRound,
          },
          (_, index) => ({
            gameSessionId: session.id,
            roundNumber: existing.currentRound + index + 1,
          }),
        ),
      });
    }
  }
}
