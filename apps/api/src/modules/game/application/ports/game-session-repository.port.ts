import type { GameSession } from '../../domain/entities/game-session.js';

export interface TransferHistoryRecord {
  gameSessionId: string;
  sourceAgentId: string;
  destinationAgentId: string;
  amount: string;
}

export interface DepositHistoryRecord {
  gameSessionId: string;
  agentId: string;
  amount: string;
}

export interface WithdrawalHistoryRecord {
  gameSessionId: string;
  agentId: string;
  amount: string;
}

export interface CustodyPlacementHistoryRecord {
  gameSessionId: string;
  roundNumber: number;
  bankerAgentId: string;
  ownerAgentId: string;
  amount: string;
}

export interface CustodyRedemptionHistoryRecord {
  gameSessionId: string;
  roundNumber: number;
  bankerAgentId: string;
  ownerAgentId: string;
  amount: string;
}

export interface CustodyAccrualHistoryRecord {
  gameSessionId: string;
  roundNumber: number;
  bankerAgentId: string;
  ownerAgentId: string;
  amount: string;
}

export interface GameSessionRepositoryPort {
  save(session: GameSession): Promise<void>;
  saveWithTransfer(
    session: GameSession,
    transfer: TransferHistoryRecord,
  ): Promise<void>;
  saveWithDeposit(
    session: GameSession,
    deposit: DepositHistoryRecord,
  ): Promise<void>;
  saveWithWithdrawal(
    session: GameSession,
    withdrawal: WithdrawalHistoryRecord,
  ): Promise<void>;
  saveWithCustodyPlacement(
    session: GameSession,
    placement: CustodyPlacementHistoryRecord,
  ): Promise<void>;
  saveWithCustodyRedemption(
    session: GameSession,
    redemption: CustodyRedemptionHistoryRecord,
  ): Promise<void>;
  saveWithCustodyAccruals(
    session: GameSession,
    accruals: CustodyAccrualHistoryRecord[],
  ): Promise<void>;
  findById(id: string): Promise<GameSession | null>;
}
