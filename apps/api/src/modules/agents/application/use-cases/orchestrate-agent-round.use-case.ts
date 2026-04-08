import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { TransferFundsUseCase } from '../../../game/application/use-cases/transfer-funds.use-case.js';
import type { AgentActionRepositoryPort } from '../ports/agent-action-repository.port.js';
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
    private readonly agentActionRepository: AgentActionRepositoryPort,
    private readonly runAgentCommunicationTurnUseCase: RunAgentCommunicationTurnUseCase,
    private readonly transferFundsUseCase: TransferFundsUseCase,
  ) {}

  async execute(
    input: OrchestrateAgentRoundInput,
  ): Promise<OrchestrateAgentRoundResult> {
    if (!Number.isInteger(input.turnCount) || input.turnCount <= 0) {
      throw new DomainInvariantError('Turn count must be a positive integer.');
    }

    const turns: OrchestrateAgentRoundResult['turns'] = [];

    for (let turnNumber = 1; turnNumber <= input.turnCount; turnNumber += 1) {
      const turn = await this.runAgentCommunicationTurnUseCase.execute({
        gameSessionId: input.gameSessionId,
        turnNumber,
      });

      await this.resolveAcceptedTransferProposals(
        turn.gameSessionId,
        turn.turnNumber,
      );

      turns.push(turn);
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

  private async resolveAcceptedTransferProposals(
    gameSessionId: string,
    turnNumber: number,
  ): Promise<void> {
    const actions = await this.agentActionRepository.findRecentByGameSessionId(
      gameSessionId,
      100,
    );
    const acceptedProposals = actions.filter(
      (action) =>
        action.turnNumber === turnNumber &&
        action.actionType === 'accept_direct_transfer_proposal' &&
        action.relatedProposalActionId,
    );

    for (const acceptance of acceptedProposals) {
      const proposal = actions.find(
        (candidate) => candidate.id === acceptance.relatedProposalActionId,
      );

      if (!proposal || proposal.actionType !== 'propose_direct_transfer') {
        throw new DomainInvariantError(
          'Accepted transfer proposal must reference a valid proposal action.',
        );
      }

      if (!proposal.recipientAgentId || !proposal.amount) {
        throw new DomainInvariantError(
          'Accepted transfer proposal is missing recipient or amount details.',
        );
      }

      await this.transferFundsUseCase.execute({
        gameSessionId,
        sourceAgentId: proposal.recipientAgentId,
        destinationAgentId: proposal.agentId,
        amount: proposal.amount,
      });
    }
  }
}
