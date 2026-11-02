import type {
  ReplayEventRecord,
  RoundSummaryRecord,
} from '@llm-sim/shared-types';

export interface RoundSummaryInput {
  roundNumber: number;
  totalEventCount: number;
  events: ReplayEventRecord[];
}
export interface RoundSummaryGatewayPort {
  readonly provider: RoundSummaryRecord['provider'];
  generate(input: RoundSummaryInput): Promise<string>;
}
export interface RoundSummaryRepositoryPort {
  find(
    gameSessionId: string,
    roundNumber: number,
  ): Promise<RoundSummaryRecord | null>;
  save(summary: RoundSummaryRecord): Promise<void>;
}
