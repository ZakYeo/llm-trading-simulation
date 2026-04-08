import type { PrismaClient } from '@prisma/client';
import type {
  AgentMessageRecord,
  AgentMessageRepositoryPort,
} from '../../application/ports/agent-message-repository.port.js';

interface PrismaAgentMessageRecord {
  id: string;
  gameSessionId: string;
  roundNumber: number;
  turnNumber: number;
  senderAgentId: string;
  recipientAgentId: string | null;
  visibility: string;
  content: string;
  createdAt: Date;
}

export class PrismaAgentMessageRepository implements AgentMessageRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async save(message: AgentMessageRecord): Promise<AgentMessageRecord> {
    const record = await this.prisma.agentMessage.create({
      data: {
        gameSessionId: message.gameSessionId,
        roundNumber: message.roundNumber,
        turnNumber: message.turnNumber,
        senderAgentId: message.senderAgentId,
        recipientAgentId: message.recipientAgentId,
        visibility: message.visibility === 'public' ? 'PUBLIC' : 'PRIVATE',
        content: message.content,
      },
    });

    return {
      id: record.id,
      gameSessionId: record.gameSessionId,
      roundNumber: record.roundNumber,
      turnNumber: record.turnNumber,
      senderAgentId: record.senderAgentId,
      recipientAgentId: record.recipientAgentId,
      visibility: record.visibility === 'PUBLIC' ? 'public' : 'private',
      content: record.content,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async findRecentByGameSessionId(
    gameSessionId: string,
    limit: number,
  ): Promise<AgentMessageRecord[]> {
    const records = (await this.prisma.agentMessage.findMany({
      where: { gameSessionId },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    })) as PrismaAgentMessageRecord[];

    return records.map((record) => ({
      id: record.id,
      gameSessionId: record.gameSessionId,
      roundNumber: record.roundNumber,
      turnNumber: record.turnNumber,
      senderAgentId: record.senderAgentId,
      recipientAgentId: record.recipientAgentId,
      visibility: record.visibility === 'PUBLIC' ? 'public' : 'private',
      content: record.content,
      createdAt: record.createdAt.toISOString(),
    }));
  }
}
