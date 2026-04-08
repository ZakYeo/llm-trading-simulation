import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { TransferFundsUseCase } from '../../../game/application/use-cases/transfer-funds.use-case.js';
import type { AgentActionRepositoryPort } from '../ports/agent-action-repository.port.js';
import type { AgentSessionEventStreamService } from '../services/agent-session-event-stream.service.js';
import type { RunAgentCommunicationTurnUseCase } from './run-agent-communication-turn.use-case.js';

function isTransferProposalActionType(actionType: string): boolean {
  return (
    actionType === 'propose_direct_transfer' ||
    actionType === 'counter_direct_transfer_proposal'
  );
}

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
    private readonly agentSessionEventStreamService: AgentSessionEventStreamService,
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
      this.agentSessionEventStreamService.publish({
        type: 'turn_completed',
        gameSessionId: turn.gameSessionId,
        roundNumber: turn.roundNumber,
        turnNumber: turn.turnNumber,
        actionCount: turn.actionRecords.length,
        messageCount: turn.messages.length,
        occurredAt: new Date().toISOString(),
      });

      turns.push(turn);
    }

    const latestTurn = turns.at(-1);

    if (!latestTurn) {
      throw new DomainInvariantError(
        'Agent round orchestration produced no turns.',
      );
    }

    this.publishRoundCompleted(
      latestTurn.gameSessionId,
      latestTurn.roundNumber,
      turns.length,
    );

    return {
      gameSessionId: latestTurn.gameSessionId,
      roundNumber: latestTurn.roundNumber,
      turns,
    };
  }

  private publishRoundCompleted(
    gameSessionId: string,
    roundNumber: number,
    turnCount: number,
  ) {
    this.agentSessionEventStreamService.publish({
      type: 'round_completed',
      gameSessionId,
      roundNumber,
      turnCount,
      occurredAt: new Date().toISOString(),
    });
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

      if (!proposal || !isTransferProposalActionType(proposal.actionType)) {
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
      this.agentSessionEventStreamService.publish({
        type: 'transfer_settled',
        gameSessionId,
        roundNumber: proposal.roundNumber,
        turnNumber,
        sourceAgentId: proposal.recipientAgentId,
        destinationAgentId: proposal.agentId,
        amount: proposal.amount,
        occurredAt: new Date().toISOString(),
      });
    }
  }
}
