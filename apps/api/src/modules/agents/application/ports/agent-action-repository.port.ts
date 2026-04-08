export interface AgentActionRecord {
  id?: string;
  gameSessionId: string;
  roundNumber: number;
  turnNumber: number;
  agentId: string;
  recipientAgentId: string | null;
  actionType:
    | 'send_public_message'
    | 'send_private_message'
    | 'propose_direct_transfer'
    | 'finalize_turn';
  amount?: string;
  content?: string;
  createdAt?: string;
}

export interface AgentActionRepositoryPort {
  save(action: AgentActionRecord): Promise<AgentActionRecord>;
}
