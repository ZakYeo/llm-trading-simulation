import type {
  GameSessionHistoryRecord,
  GameSessionRepositoryPort,
} from '../../application/ports/game-session-repository.port.js';
import type { GameSession } from '../../domain/entities/game-session.js';
import { GameSessionPrismaMapper } from './game-session-prisma.mapper.js';
import type { PrismaClientLike } from './game-session-prisma.contracts.js';

export class PrismaGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private readonly prisma: PrismaClientLike) {}

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
        }
      }

      if (accruals.length > 0) {
        await tx.custodyAccrual.createMany({
          data: accruals,
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
      },
    });

    if (!record) {
      return null;
    }

    return GameSessionPrismaMapper.toDomain(record);
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

    await tx.bankerCustodyPosition.deleteMany({
      where: {
        gameSessionId: session.id,
      },
    });
    const bankerCustodyPositionData =
      GameSessionPrismaMapper.toBankerCustodyPositionCreateManyInput(session);

    if (bankerCustodyPositionData.length > 0) {
      await tx.bankerCustodyPosition.createMany({
        data: bankerCustodyPositionData,
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
