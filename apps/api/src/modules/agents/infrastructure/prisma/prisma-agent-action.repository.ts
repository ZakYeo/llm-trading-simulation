import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import type {
  AgentActionRecord,
  AgentActionRepositoryPort,
} from '../../application/ports/agent-action-repository.port.js';

function toPrismaActionType(
  actionType: AgentActionRecord['actionType'],
): string {
  switch (actionType) {
    case 'send_public_message':
      return 'SEND_PUBLIC_MESSAGE';
    case 'send_private_message':
      return 'SEND_PRIVATE_MESSAGE';
    case 'propose_direct_transfer':
      return 'PROPOSE_DIRECT_TRANSFER';
    case 'counter_direct_transfer_proposal':
      return 'COUNTER_DIRECT_TRANSFER_PROPOSAL';
    case 'accept_direct_transfer_proposal':
      return 'ACCEPT_DIRECT_TRANSFER_PROPOSAL';
    case 'reject_direct_transfer_proposal':
      return 'REJECT_DIRECT_TRANSFER_PROPOSAL';
    case 'finalize_turn':
      return 'FINALIZE_TURN';
  }

  throw new Error(`Unsupported agent action type: ${String(actionType)}`);
}

function fromPrismaActionType(
  actionType: string,
): AgentActionRecord['actionType'] {
  switch (actionType) {
    case 'SEND_PUBLIC_MESSAGE':
      return 'send_public_message';
    case 'SEND_PRIVATE_MESSAGE':
      return 'send_private_message';
    case 'PROPOSE_DIRECT_TRANSFER':
      return 'propose_direct_transfer';
    case 'COUNTER_DIRECT_TRANSFER_PROPOSAL':
      return 'counter_direct_transfer_proposal';
    case 'ACCEPT_DIRECT_TRANSFER_PROPOSAL':
      return 'accept_direct_transfer_proposal';
    case 'REJECT_DIRECT_TRANSFER_PROPOSAL':
      return 'reject_direct_transfer_proposal';
    case 'FINALIZE_TURN':
      return 'finalize_turn';
  }

  throw new Error(`Unsupported prisma action type: ${actionType}`);
}

interface PrismaAgentTurnActionRecord {
  id: string;
  gameSessionId: string;
  roundNumber: number;
  turnNumber: number;
  agentId: string;
  recipientAgentId: string | null;
  relatedProposalActionId: string | null;
  actionType: string;
  amount: Prisma.Decimal | null;
  content: string | null;
  createdAt: Date;
}

export class PrismaAgentActionRepository implements AgentActionRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async save(action: AgentActionRecord): Promise<AgentActionRecord> {
    const delegate = (
      this.prisma as unknown as {
        agentTurnAction: {
          create(args: {
            data: Record<string, unknown>;
          }): Promise<PrismaAgentTurnActionRecord>;
          findMany(
            args: Record<string, unknown>,
          ): Promise<PrismaAgentTurnActionRecord[]>;
        };
      }
    ).agentTurnAction;
    const record = await delegate.create({
      data: {
        gameSessionId: action.gameSessionId,
        roundNumber: action.roundNumber,
        turnNumber: action.turnNumber,
        agentId: action.agentId,
        recipientAgentId: action.recipientAgentId,
        relatedProposalActionId: action.relatedProposalActionId,
        actionType: toPrismaActionType(action.actionType),
        amount:
          action.amount === undefined
            ? undefined
            : new Prisma.Decimal(action.amount),
        content: action.content,
      },
    });

    return {
      id: record.id,
      gameSessionId: record.gameSessionId,
      roundNumber: record.roundNumber,
      turnNumber: record.turnNumber,
      agentId: record.agentId,
      recipientAgentId: record.recipientAgentId,
      relatedProposalActionId: record.relatedProposalActionId ?? undefined,
      actionType: fromPrismaActionType(record.actionType),
      amount: record.amount?.toString(),
      content: record.content ?? undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async findRecentByGameSessionId(
    gameSessionId: string,
    limit: number,
  ): Promise<AgentActionRecord[]> {
    const delegate = (
      this.prisma as unknown as {
        agentTurnAction: {
          findMany(
            args: Record<string, unknown>,
          ): Promise<PrismaAgentTurnActionRecord[]>;
        };
      }
    ).agentTurnAction;
    const records = await delegate.findMany({
      where: { gameSessionId },
      orderBy: [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      take: limit,
    });

    return records.map((record) => ({
      id: record.id,
      gameSessionId: record.gameSessionId,
      roundNumber: record.roundNumber,
      turnNumber: record.turnNumber,
      agentId: record.agentId,
      recipientAgentId: record.recipientAgentId,
      relatedProposalActionId: record.relatedProposalActionId ?? undefined,
      actionType: fromPrismaActionType(record.actionType),
      amount: record.amount?.toString(),
      content: record.content ?? undefined,
      createdAt: record.createdAt.toISOString(),
    }));
  }
}
