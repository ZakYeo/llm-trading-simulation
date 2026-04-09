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
    | 'counter_direct_transfer_proposal'
    | 'accept_direct_transfer_proposal'
    | 'reject_direct_transfer_proposal'
    | 'place_funds_with_banker'
    | 'redeem_funds_from_banker'
    | 'finalize_turn';
  relatedProposalActionId?: string;
  amount?: string;
  content?: string;
  createdAt?: string;
}

export interface AgentActionRepositoryPort {
  save(action: AgentActionRecord): Promise<AgentActionRecord>;
  findRecentByGameSessionId(
    gameSessionId: string,
    limit: number,
  ): Promise<AgentActionRecord[]>;
}
