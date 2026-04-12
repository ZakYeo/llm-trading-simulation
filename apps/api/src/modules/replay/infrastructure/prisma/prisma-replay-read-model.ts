import type { Prisma } from '../../../shared/infrastructure/prisma/prisma-client.js';
import { type PrismaClient } from '../../../shared/infrastructure/prisma/prisma-client.js';
import type {
  GameReplayRecord,
  ReplayEventRecord,
  ReplayReadModelPort,
} from '../../application/ports/replay-read-model.port.js';

const replaySessionInclude = {
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
} satisfies Prisma.GameSessionInclude;

type ReplaySessionRecord = Prisma.GameSessionGetPayload<{
  include: typeof replaySessionInclude;
}>;

function toAmountString(value: { toString(): string }): string {
  return value.toString();
}

function mapTransferEvents(session: ReplaySessionRecord): ReplayEventRecord[] {
  return session.transfers.map((transfer) => ({
    id: transfer.id,
    type: 'transfer',
    createdAt: transfer.createdAt.toISOString(),
    amount: toAmountString(transfer.amount),
    sourceAgentId: transfer.sourceAgentId,
    sourceAgentName: transfer.sourceAgent.name,
    destinationAgentId: transfer.destinationAgentId,
    destinationAgentName: transfer.destinationAgent.name,
  }));
}

function mapDepositEvents(session: ReplaySessionRecord): ReplayEventRecord[] {
  return session.deposits.map((deposit) => ({
    id: deposit.id,
    type: 'deposit',
    createdAt: deposit.createdAt.toISOString(),
    amount: toAmountString(deposit.amount),
    agentId: deposit.agentId,
    agentName: deposit.agent.name,
  }));
}

function mapWithdrawalEvents(
  session: ReplaySessionRecord,
): ReplayEventRecord[] {
  return session.withdrawals.map((withdrawal) => ({
    id: withdrawal.id,
    type: 'withdrawal',
    createdAt: withdrawal.createdAt.toISOString(),
    amount: toAmountString(withdrawal.amount),
    agentId: withdrawal.agentId,
    agentName: withdrawal.agent.name,
  }));
}

function mapCustodyPlacementEvents(
  session: ReplaySessionRecord,
): ReplayEventRecord[] {
  return session.custodyPlacements.map((placement) => ({
    id: placement.id,
    type: 'custody_placement',
    createdAt: placement.createdAt.toISOString(),
    roundNumber: placement.roundNumber,
    amount: toAmountString(placement.amount),
    bankerAgentId: placement.bankerAgentId,
    bankerAgentName: placement.bankerAgent.name,
    ownerAgentId: placement.ownerAgentId,
    ownerAgentName: placement.ownerAgent.name,
  }));
}

function mapCustodyRedemptionEvents(
  session: ReplaySessionRecord,
): ReplayEventRecord[] {
  return session.custodyRedemptions.map((redemption) => ({
    id: redemption.id,
    type: 'custody_redemption',
    createdAt: redemption.createdAt.toISOString(),
    roundNumber: redemption.roundNumber,
    amount: toAmountString(redemption.amount),
    bankerAgentId: redemption.bankerAgentId,
    bankerAgentName: redemption.bankerAgent.name,
    ownerAgentId: redemption.ownerAgentId,
    ownerAgentName: redemption.ownerAgent.name,
  }));
}

function mapCustodyAccrualEvents(
  session: ReplaySessionRecord,
): ReplayEventRecord[] {
  return session.custodyAccruals.map((accrual) => ({
    id: accrual.id,
    type: 'custody_accrual',
    createdAt: accrual.createdAt.toISOString(),
    roundNumber: accrual.roundNumber,
    amount: toAmountString(accrual.amount),
    bankerAgentId: accrual.bankerAgentId,
    bankerAgentName: accrual.bankerAgent.name,
    ownerAgentId: accrual.ownerAgentId,
    ownerAgentName: accrual.ownerAgent.name,
  }));
}

function mapMessageEvents(session: ReplaySessionRecord): ReplayEventRecord[] {
  return session.agentMessages.map((message) => ({
    id: message.id,
    type: 'message',
    createdAt: message.createdAt.toISOString(),
    roundNumber: message.roundNumber,
    turnNumber: message.turnNumber,
    senderAgentId: message.senderAgentId,
    senderAgentName: message.senderAgent.name,
    recipientAgentId: message.recipientAgentId,
    recipientAgentName: message.recipientAgent?.name ?? undefined,
    visibility: message.visibility === 'PUBLIC' ? 'public' : 'private',
    content: message.content,
  }));
}

function toReplayActionType(
  actionType: ReplaySessionRecord['agentTurnActions'][number]['actionType'],
): NonNullable<ReplayEventRecord['actionType']> {
  switch (actionType) {
    case 'SEND_PUBLIC_MESSAGE':
      return 'send_public_message';
    case 'SEND_PRIVATE_MESSAGE':
      return 'send_private_message';
    case 'PROPOSE_DIRECT_TRANSFER':
      return 'request_payment';
    case 'COUNTER_DIRECT_TRANSFER_PROPOSAL':
      return 'counter_payment_request';
    case 'ACCEPT_DIRECT_TRANSFER_PROPOSAL':
      return 'accept_payment_request';
    case 'REJECT_DIRECT_TRANSFER_PROPOSAL':
      return 'reject_payment_request';
    case 'PLACE_FUNDS_WITH_BANKER':
      return 'place_funds_with_banker';
    case 'REDEEM_FUNDS_FROM_BANKER':
      return 'redeem_funds_from_banker';
    case 'FINALIZE_TURN':
      return 'finalize_turn';
  }

  throw new Error(`Unsupported replay action type: ${String(actionType)}`);
}

function mapActionEvents(session: ReplaySessionRecord): ReplayEventRecord[] {
  return session.agentTurnActions.map((action) => ({
    id: action.id,
    type: 'action',
    createdAt: action.createdAt.toISOString(),
    roundNumber: action.roundNumber,
    turnNumber: action.turnNumber,
    agentId: action.agentId,
    agentName: action.agent.name,
    recipientAgentId: action.recipientAgentId,
    relatedProposalActionId: action.relatedProposalActionId ?? undefined,
    amount: action.amount ? toAmountString(action.amount) : undefined,
    content: action.content ?? undefined,
    actionType: toReplayActionType(action.actionType),
  }));
}

function mapReplayEvents(session: ReplaySessionRecord): ReplayEventRecord[] {
  return [
    ...mapTransferEvents(session),
    ...mapDepositEvents(session),
    ...mapWithdrawalEvents(session),
    ...mapCustodyPlacementEvents(session),
    ...mapCustodyRedemptionEvents(session),
    ...mapCustodyAccrualEvents(session),
    ...mapMessageEvents(session),
    ...mapActionEvents(session),
  ].sort((left, right) => {
    const createdAtCompare = left.createdAt.localeCompare(right.createdAt);

    if (createdAtCompare !== 0) {
      return createdAtCompare;
    }

    return left.id.localeCompare(right.id);
  });
}

function toReplaySessionStatus(
  status: ReplaySessionRecord['status'],
): GameReplayRecord['gameSession']['status'] {
  switch (status) {
    case 'SETUP':
      return 'setup';
    case 'ACTIVE':
      return 'active';
    case 'SETTLEMENT':
      return 'settlement';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
  }
}

export class PrismaReplayReadModel implements ReplayReadModelPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findByGameSessionId(
    gameSessionId: string,
  ): Promise<GameReplayRecord | null> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: gameSessionId },
      include: replaySessionInclude,
    });

    if (!session) {
      return null;
    }

    return {
      gameSession: {
        id: session.id,
        name: session.name,
        status: toReplaySessionStatus(session.status),
        currentRound: session.currentRound,
      },
      rounds: session.rounds.map((round) => ({
        id: round.id,
        roundNumber: round.roundNumber,
        createdAt: round.createdAt.toISOString(),
      })),
      events: mapReplayEvents(session),
    };
  }
}
