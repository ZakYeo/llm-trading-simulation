import type {
  GameReplayRecord,
  ReplayEventRecord,
  ReplayReadModelPort,
} from '../../application/ports/replay-read-model.port.js';
import type { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';

function toAmountString(value: { toString(): string }): string {
  return value.toString();
}

export class PrismaReplayReadModel implements ReplayReadModelPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByGameSessionId(
    gameSessionId: string,
  ): Promise<GameReplayRecord | null> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: gameSessionId },
      include: {
        rounds: {
          orderBy: {
            roundNumber: 'asc',
          },
        },
        transfers: {
          include: {
            sourceAgent: true,
            destinationAgent: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        deposits: {
          include: {
            agent: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        withdrawals: {
          include: {
            agent: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    const events: ReplayEventRecord[] = [
      ...session.transfers.map((transfer) => ({
        id: transfer.id,
        type: 'transfer' as const,
        createdAt: transfer.createdAt.toISOString(),
        amount: toAmountString(transfer.amount),
        sourceAgentId: transfer.sourceAgentId,
        sourceAgentName: transfer.sourceAgent.name,
        destinationAgentId: transfer.destinationAgentId,
        destinationAgentName: transfer.destinationAgent.name,
      })),
      ...session.deposits.map((deposit) => ({
        id: deposit.id,
        type: 'deposit' as const,
        createdAt: deposit.createdAt.toISOString(),
        amount: toAmountString(deposit.amount),
        agentId: deposit.agentId,
        agentName: deposit.agent.name,
      })),
      ...session.withdrawals.map((withdrawal) => ({
        id: withdrawal.id,
        type: 'withdrawal' as const,
        createdAt: withdrawal.createdAt.toISOString(),
        amount: toAmountString(withdrawal.amount),
        agentId: withdrawal.agentId,
        agentName: withdrawal.agent.name,
      })),
    ].sort((left, right) => {
      const createdAtCompare = left.createdAt.localeCompare(right.createdAt);

      if (createdAtCompare !== 0) {
        return createdAtCompare;
      }

      return left.id.localeCompare(right.id);
    });

    return {
      gameSession: {
        id: session.id,
        name: session.name,
        status: session.status.toLowerCase(),
        currentRound: session.currentRound,
      },
      rounds: session.rounds.map((round) => ({
        id: round.id,
        roundNumber: round.roundNumber,
        createdAt: round.createdAt.toISOString(),
      })),
      events,
    };
  }
}
