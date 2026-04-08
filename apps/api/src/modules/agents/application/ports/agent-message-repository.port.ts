export interface AgentMessageRecord {
  id?: string;
  gameSessionId: string;
  roundNumber: number;
  turnNumber: number;
  senderAgentId: string;
  recipientAgentId: string | null;
  visibility: 'public' | 'private';
  content: string;
  createdAt?: string;
}

export interface AgentMessageRepositoryPort {
  save(message: AgentMessageRecord): Promise<AgentMessageRecord>;
  findRecentByGameSessionId(
    gameSessionId: string,
    limit: number,
  ): Promise<AgentMessageRecord[]>;
}
