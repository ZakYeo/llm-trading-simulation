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
  findById(id: string): Promise<GameSession | null>;
}
