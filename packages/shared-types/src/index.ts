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
  | 'open_market_position'
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

export interface MarketOpportunityRecord {
  id: string;
  templateId: string;
  category:
    | 'carry'
    | 'event'
    | 'trend'
    | 'arbitrage'
    | 'liquidity_stress'
    | 'special_situation';
  title: string;
  summary: string;
  riskLevel: 'low' | 'high';
  listedRound: number;
  settlementRound: number;
  minCommitment: string;
  maxCommitment: string;
  estimatedNetReturnBps: number;
  worstCaseReturnBps: number;
  bestCaseReturnBps: number;
}

export interface MarketPositionRecord {
  opportunityId: string;
  ownerAgentId: string;
  opportunityTitle: string;
  principal: string;
  entryRound: number;
  settlementRound: number;
}

export interface GameSessionRecord extends GameSessionSummary {
  agents: GameAgentRecord[];
  bankerCustodyPositions: BankerCustodyPositionRecord[];
  marketOpportunities: MarketOpportunityRecord[];
  marketPositions: MarketPositionRecord[];
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
    | 'custody_accrual'
    | 'market_opportunity_listed'
    | 'market_position_opened'
    | 'market_position_settled'
    | 'market_opportunity_resolved';
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
  opportunityId?: string;
  opportunityTitle?: string;
  opportunityCategory?: MarketOpportunityRecord['category'];
  opportunitySummary?: string;
  opportunityRiskLevel?: MarketOpportunityRecord['riskLevel'];
  listedRound?: number;
  settlementRound?: number;
  minCommitment?: string;
  maxCommitment?: string;
  estimatedNetReturnBps?: number;
  worstCaseReturnBps?: number;
  bestCaseReturnBps?: number;
  participantCount?: number;
  totalPrincipal?: string;
  totalProfitOrLoss?: string;
  participantSettlements?: Array<{
    ownerAgentId: string;
    ownerAgentName: string;
    principal: string;
    profitOrLoss: string;
  }>;
  senderAgentId?: string;
  senderAgentName?: string;
  recipientAgentId?: string | null;
  recipientAgentName?: string;
  visibility?: AgentMessageVisibility;
  content?: string;
  actionType?: AgentActionType;
  relatedProposalActionId?: string;
  profitOrLoss?: string;
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
