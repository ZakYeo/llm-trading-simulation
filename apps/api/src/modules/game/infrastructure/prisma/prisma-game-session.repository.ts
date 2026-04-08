import type {
  DepositHistoryRecord,
  GameSessionRepositoryPort,
  TransferHistoryRecord,
  WithdrawalHistoryRecord,
} from '../../application/ports/game-session-repository.port.js';
import type { GameSession } from '../../domain/entities/game-session.js';
import { GameSessionPrismaMapper } from './game-session-prisma.mapper.js';
import type { PrismaClientLike } from './game-session-prisma.contracts.js';

export class PrismaGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private readonly prisma: PrismaClientLike) {}

  async save(session: GameSession): Promise<void> {
    await this.persistSession(this.prisma, session);
  }

  async saveWithTransfer(
    session: GameSession,
    transfer: TransferHistoryRecord,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.persistSession(tx, session);
      await tx.transfer.create({
        data: transfer,
      });
    });
  }

  async saveWithDeposit(
    session: GameSession,
    deposit: DepositHistoryRecord,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.persistSession(tx, session);
      await tx.deposit.create({
        data: deposit,
      });
    });
  }

  async saveWithWithdrawal(
    session: GameSession,
    withdrawal: WithdrawalHistoryRecord,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.persistSession(tx, session);
      await tx.withdrawal.create({
        data: withdrawal,
      });
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
