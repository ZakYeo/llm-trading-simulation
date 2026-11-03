import type { DepositMessageTerms } from '../../../game/domain/entities/deposit-negotiation.js';
import type { AgentPersonalityProfile } from '@llm-sim/shared-types';
import type { AgentActionType } from '@llm-sim/shared-types';

export interface AgentActionRecord {
  decisionExplanation?: string;
  decisionFailure?: string;
  personalitySnapshot?: AgentPersonalityProfile;
  depositTerms?: DepositMessageTerms;
  id?: string;
  gameSessionId: string;
  roundNumber: number;
  turnNumber: number;
  agentId: string;
  recipientAgentId: string | null;
  actionType: AgentActionType;
  relatedProposalActionId?: string;
  amount?: string;
  content?: string;
  createdAt?: string;
}

export interface AgentActionRepositoryPort {
  save(action: AgentActionRecord): Promise<AgentActionRecord>;
  deleteById(actionId: string): Promise<void>;
  findRecentByGameSessionId(
    gameSessionId: string,
    limit: number,
  ): Promise<AgentActionRecord[]>;
}
