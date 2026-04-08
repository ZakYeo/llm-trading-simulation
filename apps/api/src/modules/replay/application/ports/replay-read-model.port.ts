export interface ReplayRoundRecord {
  id: string;
  roundNumber: number;
  createdAt: string;
}

export interface ReplayEventRecord {
  id: string;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'message' | 'action';
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
    | 'finalize_turn';
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
