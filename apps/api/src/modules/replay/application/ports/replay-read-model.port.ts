export interface ReplayRoundRecord {
  id: string;
  roundNumber: number;
  createdAt: string;
}

export interface ReplayEventRecord {
  id: string;
  type: 'transfer' | 'deposit' | 'withdrawal';
  createdAt: string;
  amount: string;
  agentId?: string;
  agentName?: string;
  sourceAgentId?: string;
  sourceAgentName?: string;
  destinationAgentId?: string;
  destinationAgentName?: string;
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
