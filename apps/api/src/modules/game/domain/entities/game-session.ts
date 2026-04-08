import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { GameAgent } from './game-agent.js';

export type GameSessionStatus =
  | 'setup'
  | 'active'
  | 'settlement'
  | 'completed'
  | 'failed';

export interface GameSessionProps {
  id: string;
  name: string;
  status: GameSessionStatus;
  currentRound: number;
  agents: GameAgent[];
}

export class GameSession {
  readonly id: string;
  readonly name: string;
  readonly status: GameSessionStatus;
  readonly currentRound: number;
  readonly agents: GameAgent[];

  constructor(props: GameSessionProps) {
    if (props.name.trim().length === 0) {
      throw new DomainInvariantError('Game session name is required.');
    }

    if (props.agents.length === 0) {
      throw new DomainInvariantError(
        'Game session must contain at least one agent.',
      );
    }

    this.id = props.id;
    this.name = props.name;
    this.status = props.status;
    this.currentRound = props.currentRound;
    this.agents = props.agents;
  }
}
