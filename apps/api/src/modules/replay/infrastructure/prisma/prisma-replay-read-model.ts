import type {
  GameReplayRecord,
  ReplayEventRecord,
  ReplayReadModelPort,
} from '../../application/ports/replay-read-model.port.js';
import type { PrismaClient } from '../../../shared/infrastructure/prisma/prisma-client.js';

interface ReplaySessionRecord {
  id: string;
  name: string;
  status: { toLowerCase(): string };
  currentRound: number;
  rounds: Array<{ id: string; roundNumber: number; createdAt: Date }>;
  transfers: Array<{
    id: string;
    createdAt: Date;
    amount: { toString(): string };
    sourceAgentId: string;
    sourceAgent: { name: string };
    destinationAgentId: string;
    destinationAgent: { name: string };
  }>;
  deposits: Array<{
    id: string;
    createdAt: Date;
    amount: { toString(): string };
    agentId: string;
    agent: { name: string };
  }>;
  withdrawals: Array<{
    id: string;
    createdAt: Date;
    amount: { toString(): string };
    agentId: string;
    agent: { name: string };
  }>;
  custodyPlacements: Array<{
    id: string;
    createdAt: Date;
    roundNumber: number;
    amount: { toString(): string };
    bankerAgentId: string;
    bankerAgent: { name: string };
    ownerAgentId: string;
    ownerAgent: { name: string };
  }>;
  custodyRedemptions: Array<{
    id: string;
    createdAt: Date;
    roundNumber: number;
    amount: { toString(): string };
    bankerAgentId: string;
    bankerAgent: { name: string };
    ownerAgentId: string;
    ownerAgent: { name: string };
  }>;
  custodyAccruals: Array<{
    id: string;
    createdAt: Date;
    roundNumber: number;
    amount: { toString(): string };
    bankerAgentId: string;
    bankerAgent: { name: string };
    ownerAgentId: string;
    ownerAgent: { name: string };
  }>;
  agentMessages: Array<{
    id: string;
    createdAt: Date;
    roundNumber: number;
    turnNumber: number;
    senderAgentId: string;
    senderAgent: { name: string };
    recipientAgentId: string | null;
    recipientAgent?: { name: string } | null;
    visibility: string;
    content: string;
  }>;
  agentTurnActions: Array<{
    id: string;
    createdAt: Date;
    roundNumber: number;
    turnNumber: number;
    agentId: string;
    agent: { name: string };
    recipientAgentId: string | null;
    relatedProposalActionId: string | null;
    amount: { toString(): string } | null;
    content: string | null;
    actionType: string;
  }>;
}

function toAmountString(value: { toString(): string }): string {
  return value.toString();
}

export class PrismaReplayReadModel implements ReplayReadModelPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findByGameSessionId(
    gameSessionId: string,
  ): Promise<GameReplayRecord | null> {
    const delegate = (
      this.prisma as unknown as {
        gameSession: {
          findUnique(
            args: Record<string, unknown>,
          ): Promise<ReplaySessionRecord | null>;
        };
      }
    ).gameSession;
    const session = await delegate.findUnique({
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
        custodyPlacements: {
          include: {
            bankerAgent: true,
            ownerAgent: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        custodyRedemptions: {
          include: {
            bankerAgent: true,
            ownerAgent: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        custodyAccruals: {
          include: {
            bankerAgent: true,
            ownerAgent: true,
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
      ...session.custodyPlacements.map((placement) => ({
        id: placement.id,
        type: 'custody_placement' as const,
        createdAt: placement.createdAt.toISOString(),
        roundNumber: placement.roundNumber,
        amount: toAmountString(placement.amount),
        bankerAgentId: placement.bankerAgentId,
        bankerAgentName: placement.bankerAgent.name,
        ownerAgentId: placement.ownerAgentId,
        ownerAgentName: placement.ownerAgent.name,
      })),
      ...session.custodyRedemptions.map((redemption) => ({
        id: redemption.id,
        type: 'custody_redemption' as const,
        createdAt: redemption.createdAt.toISOString(),
        roundNumber: redemption.roundNumber,
        amount: toAmountString(redemption.amount),
        bankerAgentId: redemption.bankerAgentId,
        bankerAgentName: redemption.bankerAgent.name,
        ownerAgentId: redemption.ownerAgentId,
        ownerAgentName: redemption.ownerAgent.name,
      })),
      ...session.custodyAccruals.map((accrual) => ({
        id: accrual.id,
        type: 'custody_accrual' as const,
        createdAt: accrual.createdAt.toISOString(),
        roundNumber: accrual.roundNumber,
        amount: toAmountString(accrual.amount),
        bankerAgentId: accrual.bankerAgentId,
        bankerAgentName: accrual.bankerAgent.name,
        ownerAgentId: accrual.ownerAgentId,
        ownerAgentName: accrual.ownerAgent.name,
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
          case 'COUNTER_DIRECT_TRANSFER_PROPOSAL':
            actionType = 'counter_direct_transfer_proposal';
            break;
          case 'ACCEPT_DIRECT_TRANSFER_PROPOSAL':
            actionType = 'accept_direct_transfer_proposal';
            break;
          case 'REJECT_DIRECT_TRANSFER_PROPOSAL':
            actionType = 'reject_direct_transfer_proposal';
            break;
          case 'PLACE_FUNDS_WITH_BANKER':
            actionType = 'place_funds_with_banker';
            break;
          case 'REDEEM_FUNDS_FROM_BANKER':
            actionType = 'redeem_funds_from_banker';
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
          relatedProposalActionId: action.relatedProposalActionId ?? undefined,
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
