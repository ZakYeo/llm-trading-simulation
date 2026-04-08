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
