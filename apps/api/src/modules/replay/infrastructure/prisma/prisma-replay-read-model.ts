import type {
  GameReplayRecord,
  ReplayEventRecord,
  ReplayReadModelPort,
} from '../../application/ports/replay-read-model.port.js';
import type { PrismaClient } from '@prisma/client';

function toAmountString(value: { toString(): string }): string {
  return value.toString();
}

export class PrismaReplayReadModel implements ReplayReadModelPort {
  constructor(private readonly prisma: PrismaClient) {}

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
        agentMessages: {
          include: {
            senderAgent: true,
            recipientAgent: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        agentTurnActions: {
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
      ...session.agentMessages.map((message) => {
        const visibility: ReplayEventRecord['visibility'] =
          message.visibility === 'PUBLIC' ? 'public' : 'private';

        return {
          id: message.id,
          type: 'message' as const,
          createdAt: message.createdAt.toISOString(),
          roundNumber: message.roundNumber,
          turnNumber: message.turnNumber,
          senderAgentId: message.senderAgentId,
          senderAgentName: message.senderAgent.name,
          recipientAgentId: message.recipientAgentId,
          recipientAgentName: message.recipientAgent?.name,
          visibility,
          content: message.content,
        };
      }),
      ...session.agentTurnActions.map((action) => {
        let actionType: ReplayEventRecord['actionType'];

        switch (action.actionType) {
          case 'SEND_PUBLIC_MESSAGE':
            actionType = 'send_public_message';
            break;
          case 'SEND_PRIVATE_MESSAGE':
            actionType = 'send_private_message';
            break;
          case 'PROPOSE_DIRECT_TRANSFER':
            actionType = 'propose_direct_transfer';
            break;
          case 'FINALIZE_TURN':
            actionType = 'finalize_turn';
            break;
        }

        return {
          id: action.id,
          type: 'action' as const,
          createdAt: action.createdAt.toISOString(),
          roundNumber: action.roundNumber,
          turnNumber: action.turnNumber,
          agentId: action.agentId,
          agentName: action.agent.name,
          recipientAgentId: action.recipientAgentId,
          amount: action.amount ? toAmountString(action.amount) : undefined,
          content: action.content ?? undefined,
          actionType,
        };
      }),
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
