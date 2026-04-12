export type AgentRole =
  | 'banker'
  | 'analyst'
  | 'lawyer'
  | 'influencer'
  | 'trader';

export interface MoneyAmount {
  currency: 'SIM';
  amount: string;
}

export interface GameSessionSummary {
  id: string;
  name: string;
  status: 'setup' | 'active' | 'settlement' | 'completed' | 'failed';
  currentRound: number;
}

export type AgentActionType =
  | 'send_public_message'
  | 'send_private_message'
  | 'request_payment'
  | 'counter_payment_request'
  | 'accept_payment_request'
  | 'reject_payment_request'
  | 'place_funds_with_banker'
  | 'redeem_funds_from_banker'
  | 'finalize_turn';

export type AgentMessageVisibility = 'public' | 'private';

export interface GameAgentRecord {
  id: string;
  name: string;
  role: AgentRole;
  availableBalance: string;
  reservedBalance: string;
}

export interface BankerCustodyPositionRecord {
  bankerAgentId: string;
  ownerAgentId: string;
  principal: string;
  accruedInterest: string;
  totalBalance: string;
}

export interface GameSessionRecord extends GameSessionSummary {
  agents: GameAgentRecord[];
  bankerCustodyPositions: BankerCustodyPositionRecord[];
}

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
  visibility?: AgentMessageVisibility;
  content?: string;
  actionType?: AgentActionType;
  relatedProposalActionId?: string;
}

export interface GameReplayRecord {
  gameSession: GameSessionSummary;
  rounds: ReplayRoundRecord[];
  events: ReplayEventRecord[];
}

export interface CommunicationTurnRecord {
  gameSessionId: string;
  roundNumber: number;
  turnNumber: number;
  actions: Array<{
    agentId: string;
    agentName: string;
    action: {
      type: AgentActionType;
    };
  }>;
  actionRecords: Array<{
    id?: string;
    actionType: AgentActionType;
    amount?: string;
    relatedProposalActionId?: string;
  }>;
  messages: Array<{
    id?: string;
    visibility: AgentMessageVisibility;
    content: string;
  }>;
}

export interface OrchestratedRoundRecord {
  gameSessionId: string;
  roundNumber: number;
  turns: CommunicationTurnRecord[];
}

export type AgentSessionEventRecord =
  | {
      type: 'action_progressed';
      gameSessionId: string;
      roundNumber: number;
      turnNumber: number;
      agentId: string;
      agentName: string;
      actionType: Exclude<AgentActionType, 'finalize_turn'>;
      messageId?: string;
      messageVisibility?: AgentMessageVisibility;
      occurredAt: string;
    }
  | {
      type: 'transfer_settled';
      gameSessionId: string;
      roundNumber: number;
      turnNumber: number;
      sourceAgentId: string;
      destinationAgentId: string;
      amount: string;
      occurredAt: string;
    }
  | {
      type: 'turn_completed';
      gameSessionId: string;
      roundNumber: number;
      turnNumber: number;
      actionCount: number;
      messageCount: number;
      occurredAt: string;
    }
  | {
      type: 'round_completed';
      gameSessionId: string;
      roundNumber: number;
      turnCount: number;
      occurredAt: string;
    };
