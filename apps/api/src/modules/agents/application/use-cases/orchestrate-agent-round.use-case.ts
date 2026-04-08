import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { RunAgentCommunicationTurnUseCase } from './run-agent-communication-turn.use-case.js';

export interface OrchestrateAgentRoundInput {
  gameSessionId: string;
  turnCount: number;
}

export interface OrchestrateAgentRoundResult {
  gameSessionId: string;
  roundNumber: number;
  turns: Array<
    Awaited<ReturnType<RunAgentCommunicationTurnUseCase['execute']>>
  >;
}

export class OrchestrateAgentRoundUseCase {
  constructor(
    private readonly runAgentCommunicationTurnUseCase: RunAgentCommunicationTurnUseCase,
  ) {}

  async execute(
    input: OrchestrateAgentRoundInput,
  ): Promise<OrchestrateAgentRoundResult> {
    if (!Number.isInteger(input.turnCount) || input.turnCount <= 0) {
      throw new DomainInvariantError('Turn count must be a positive integer.');
    }

    const turns: OrchestrateAgentRoundResult['turns'] = [];

    for (let turnNumber = 1; turnNumber <= input.turnCount; turnNumber += 1) {
      turns.push(
        await this.runAgentCommunicationTurnUseCase.execute({
          gameSessionId: input.gameSessionId,
          turnNumber,
        }),
      );
    }

    const latestTurn = turns.at(-1);

    if (!latestTurn) {
      throw new DomainInvariantError(
        'Agent round orchestration produced no turns.',
      );
    }

    return {
      gameSessionId: latestTurn.gameSessionId,
      roundNumber: latestTurn.roundNumber,
      turns,
    };
  }
}
