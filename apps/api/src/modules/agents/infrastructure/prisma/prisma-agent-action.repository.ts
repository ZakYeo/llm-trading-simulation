import { AgentTurnActionType, Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import type {
  AgentActionRecord,
  AgentActionRepositoryPort,
} from '../../application/ports/agent-action-repository.port.js';

function toPrismaActionType(
  actionType: AgentActionRecord['actionType'],
): AgentTurnActionType {
  switch (actionType) {
    case 'send_public_message':
      return AgentTurnActionType.SEND_PUBLIC_MESSAGE;
    case 'send_private_message':
      return AgentTurnActionType.SEND_PRIVATE_MESSAGE;
    case 'propose_direct_transfer':
      return AgentTurnActionType.PROPOSE_DIRECT_TRANSFER;
    case 'finalize_turn':
      return AgentTurnActionType.FINALIZE_TURN;
  }
}

export class PrismaAgentActionRepository implements AgentActionRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async save(action: AgentActionRecord): Promise<AgentActionRecord> {
    const record = await this.prisma.agentTurnAction.create({
      data: {
        gameSessionId: action.gameSessionId,
        roundNumber: action.roundNumber,
        turnNumber: action.turnNumber,
        agentId: action.agentId,
        recipientAgentId: action.recipientAgentId,
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
      actionType: action.actionType,
      amount: record.amount?.toString(),
      content: record.content ?? undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
