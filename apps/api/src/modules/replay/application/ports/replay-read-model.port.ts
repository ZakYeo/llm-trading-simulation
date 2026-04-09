export interface ReplayRoundRecord {
  id: string;
  roundNumber: number;
  createdAt: string;
}

export interface ReplayEventRecord {
  id: string;
  type:
    | 'transfer'
    | 'deposit'
    | 'withdrawal'
    | 'message'
    | 'action'
    | 'custody_placement'
    | 'custody_redemption'
    | 'custody_accrual';
  createdAt: string;
  amount?: string;
  roundNumber?: number;
  turnNumber?: number;
  agentId?: string;
  agentName?: string;
  sourceAgentId?: string;
  sourceAgentName?: string;
  destinationAgentId?: string;
  destinationAgentName?: string;
  bankerAgentId?: string;
  bankerAgentName?: string;
  ownerAgentId?: string;
  ownerAgentName?: string;
  senderAgentId?: string;
  senderAgentName?: string;
  recipientAgentId?: string | null;
  recipientAgentName?: string;
  visibility?: 'public' | 'private';
  content?: string;
  actionType?:
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
}

export interface GameReplayRecord {
  gameSession: {
    id: string;
    name: string;
    status: string;
    currentRound: number;
  };
  rounds: ReplayRoundRecord[];
  events: ReplayEventRecord[];
}

export interface ReplayReadModelPort {
  findByGameSessionId(gameSessionId: string): Promise<GameReplayRecord | null>;
}
