import type { GameSession } from '../../domain/entities/game-session.js';

export interface TransferHistoryRecord {
  type: 'transfer';
  gameSessionId: string;
  sourceAgentId: string;
  destinationAgentId: string;
  amount: string;
}

export interface DepositHistoryRecord {
  type: 'deposit';
  gameSessionId: string;
  agentId: string;
  amount: string;
}

export interface WithdrawalHistoryRecord {
  type: 'withdrawal';
  gameSessionId: string;
  agentId: string;
  amount: string;
}

export interface CustodyPlacementHistoryRecord {
  type: 'custody_placement';
  gameSessionId: string;
  roundNumber: number;
  bankerAgentId: string;
  ownerAgentId: string;
  amount: string;
}

export interface CustodyRedemptionHistoryRecord {
  type: 'custody_redemption';
  gameSessionId: string;
  roundNumber: number;
  bankerAgentId: string;
  ownerAgentId: string;
  amount: string;
}

export interface CustodyAccrualHistoryRecord {
  type: 'custody_accrual';
  gameSessionId: string;
  roundNumber: number;
  bankerAgentId: string;
  ownerAgentId: string;
  amount: string;
}

export type GameSessionHistoryRecord =
  | TransferHistoryRecord
  | DepositHistoryRecord
  | WithdrawalHistoryRecord
  | CustodyPlacementHistoryRecord
  | CustodyRedemptionHistoryRecord
  | CustodyAccrualHistoryRecord;

export interface GameSessionRepositoryPort {
  save(
    session: GameSession,
    history?: GameSessionHistoryRecord[],
  ): Promise<void>;
  findById(id: string): Promise<GameSession | null>;
}
