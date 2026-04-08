import type { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';
import type {
  AgentMessageRecord,
  AgentMessageRepositoryPort,
} from '../../application/ports/agent-message-repository.port.js';

export class PrismaAgentMessageRepository implements AgentMessageRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(message: AgentMessageRecord): Promise<AgentMessageRecord> {
    const record = await this.prisma.agentMessage.create({
      data: {
        gameSessionId: message.gameSessionId,
        roundNumber: message.roundNumber,
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
    const records = await this.prisma.agentMessage.findMany({
      where: { gameSessionId },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });

    return records.map((record) => ({
      id: record.id,
      gameSessionId: record.gameSessionId,
      roundNumber: record.roundNumber,
      senderAgentId: record.senderAgentId,
      recipientAgentId: record.recipientAgentId,
      visibility: record.visibility === 'PUBLIC' ? 'public' : 'private',
      content: record.content,
      createdAt: record.createdAt.toISOString(),
    }));
  }
}
