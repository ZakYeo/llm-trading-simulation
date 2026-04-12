import type { GameReplayRecord } from '@llm-sim/shared-types';

export type {
  GameReplayRecord,
  ReplayEventRecord,
  ReplayRoundRecord,
} from '@llm-sim/shared-types';

export interface ReplayReadModelPort {
  findByGameSessionId(gameSessionId: string): Promise<GameReplayRecord | null>;
}
