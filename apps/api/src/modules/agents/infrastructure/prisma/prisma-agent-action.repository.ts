import type {
  AgentActionRecord,
  AgentActionRepositoryPort,
} from '../../application/ports/agent-action-repository.port.js';
import type { PrismaClient } from '../../../shared/infrastructure/prisma/prisma-client.js';
import { normalizeAgentActionType } from '@llm-sim/shared-types';

function toPrismaActionType(
  actionType: AgentActionRecord['actionType'],
): string {
  switch (actionType) {
    case 'send_public_message':
      return 'SEND_PUBLIC_MESSAGE';
    case 'send_private_message':
      return 'SEND_PRIVATE_MESSAGE';
    case 'request_payment':
      return 'PROPOSE_DIRECT_TRANSFER';
    case 'counter_payment_request':
      return 'COUNTER_DIRECT_TRANSFER_PROPOSAL';
    case 'accept_payment_request':
      return 'ACCEPT_DIRECT_TRANSFER_PROPOSAL';
    case 'reject_payment_request':
      return 'REJECT_DIRECT_TRANSFER_PROPOSAL';
    case 'place_funds_with_banker':
      return 'PLACE_FUNDS_WITH_BANKER';
    case 'redeem_funds_from_banker':
      return 'REDEEM_FUNDS_FROM_BANKER';
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
      return normalizeAgentActionType('propose_direct_transfer');
    case 'COUNTER_DIRECT_TRANSFER_PROPOSAL':
      return normalizeAgentActionType('counter_direct_transfer_proposal');
    case 'ACCEPT_DIRECT_TRANSFER_PROPOSAL':
      return normalizeAgentActionType('accept_direct_transfer_proposal');
    case 'REJECT_DIRECT_TRANSFER_PROPOSAL':
      return normalizeAgentActionType('reject_direct_transfer_proposal');
    case 'PLACE_FUNDS_WITH_BANKER':
      return 'place_funds_with_banker';
    case 'REDEEM_FUNDS_FROM_BANKER':
      return 'redeem_funds_from_banker';
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
  amount: { toString(): string } | null;
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
        amount: action.amount,
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
