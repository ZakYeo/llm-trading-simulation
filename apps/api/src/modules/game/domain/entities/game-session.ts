import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { BankerCustodyPosition } from './banker-custody-position.js';
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
  bankerCustodyPositions?: BankerCustodyPosition[];
}

export class GameSession {
  readonly id: string;
  readonly name: string;
  readonly status: GameSessionStatus;
  readonly currentRound: number;
  readonly agents: GameAgent[];
  readonly bankerCustodyPositions: BankerCustodyPosition[];

  constructor(props: GameSessionProps) {
    if (props.name.trim().length === 0) {
      throw new DomainInvariantError('Game session name is required.');
    }

    if (props.agents.length === 0) {
      throw new DomainInvariantError(
        'Game session must contain at least one agent.',
      );
    }

    if (
      new Set(props.agents.map((agent) => agent.id)).size !==
      props.agents.length
    ) {
      throw new DomainInvariantError('Game session agent ids must be unique.');
    }

    const bankerCustodyPositions = props.bankerCustodyPositions ?? [];

    if (
      new Set(
        bankerCustodyPositions.map(
          (position) => `${position.bankerAgentId}:${position.ownerAgentId}`,
        ),
      ).size !== bankerCustodyPositions.length
    ) {
      throw new DomainInvariantError(
        'Game session custody positions must be unique per banker and owner.',
      );
    }

    this.id = props.id;
    this.name = props.name;
    this.status = props.status;
    this.currentRound = props.currentRound;
    this.agents = props.agents;
    this.bankerCustodyPositions = bankerCustodyPositions;
  }

  withAgents(agents: GameAgent[]): GameSession {
    return new GameSession({
      id: this.id,
      name: this.name,
      status: this.status,
      currentRound: this.currentRound,
      agents,
      bankerCustodyPositions: this.bankerCustodyPositions,
    });
  }

  withBankerCustodyPositions(
    bankerCustodyPositions: BankerCustodyPosition[],
  ): GameSession {
    return new GameSession({
      id: this.id,
      name: this.name,
      status: this.status,
      currentRound: this.currentRound,
      agents: this.agents,
      bankerCustodyPositions,
    });
  }

  advanceRound(): GameSession {
    if (this.status !== 'setup' && this.status !== 'active') {
      throw new DomainInvariantError(
        'Only setup or active game sessions can advance rounds.',
      );
    }

    return new GameSession({
      id: this.id,
      name: this.name,
      status: 'active',
      currentRound: this.currentRound + 1,
      agents: this.agents,
      bankerCustodyPositions: this.bankerCustodyPositions,
    });
  }
}
