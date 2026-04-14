import type { AgentAction } from '@llm-sim/mcp-contracts';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { GameSessionRepositoryPort } from '../../../game/application/ports/game-session-repository.port.js';
import type { OpenMarketPositionUseCase } from '../../../game/application/use-cases/open-market-position.use-case.js';
import type { PlaceFundsWithBankerUseCase } from '../../../game/application/use-cases/place-funds-with-banker.use-case.js';
import type { RedeemFundsFromBankerUseCase } from '../../../game/application/use-cases/redeem-funds-from-banker.use-case.js';
import type { AgentGatewayPort } from '../ports/agent-gateway.port.js';
import type {
  AgentActionRecord,
  AgentActionRepositoryPort,
} from '../ports/agent-action-repository.port.js';
import type {
  AgentMessageRecord,
  AgentMessageRepositoryPort,
} from '../ports/agent-message-repository.port.js';
import type { AgentSessionEventStreamService } from '../services/agent-session-event-stream.service.js';
import { AgentActionExecutor } from '../services/agent-action-executor.js';
import { AgentActionValidator } from '../services/agent-action-validator.js';
import { AgentTurnContextFactory } from '../services/agent-turn-context.factory.js';

export interface RunAgentCommunicationTurnInput {
  gameSessionId: string;
  turnNumber?: number;
}

export interface RunAgentCommunicationTurnResult {
  gameSessionId: string;
  roundNumber: number;
  turnNumber: number;
  actions: Array<{
    agentId: string;
    agentName: string;
    action: AgentAction;
  }>;
  actionRecords: AgentActionRecord[];
  messages: AgentMessageRecord[];
}

export class RunAgentCommunicationTurnUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepositoryPort,
    private readonly agentMessageRepository: AgentMessageRepositoryPort,
    private readonly agentActionRepository: AgentActionRepositoryPort,
    private readonly agentGateway: AgentGatewayPort,
    private readonly agentSessionEventStreamService: AgentSessionEventStreamService,
    private readonly placeFundsWithBankerUseCase: PlaceFundsWithBankerUseCase,
    private readonly redeemFundsFromBankerUseCase: RedeemFundsFromBankerUseCase,
    private readonly openMarketPositionUseCase: OpenMarketPositionUseCase = {
      execute: async () => {
        throw new DomainInvariantError(
          'Open market position use case is not configured.',
        );
      },
    } as unknown as OpenMarketPositionUseCase,
    private readonly agentTurnContextFactory = new AgentTurnContextFactory(),
    private readonly agentActionValidator = new AgentActionValidator(),
    private readonly agentActionExecutor = new AgentActionExecutor(
      agentMessageRepository,
      agentActionRepository,
      placeFundsWithBankerUseCase,
      redeemFundsFromBankerUseCase,
      openMarketPositionUseCase,
    ),
  ) {}

  async execute(
    input: RunAgentCommunicationTurnInput,
  ): Promise<RunAgentCommunicationTurnResult> {
    const session = await this.gameSessionRepository.findById(
      input.gameSessionId,
    );

    if (!session) {
      throw new DomainInvariantError('Game session not found.');
    }

    const turnNumber = input.turnNumber ?? 1;
    const recentActions =
      await this.agentActionRepository.findRecentByGameSessionId(
        session.id,
        50,
      );
    const recentMessages =
      await this.agentMessageRepository.findRecentByGameSessionId(
        session.id,
        20,
      );
    const actions: RunAgentCommunicationTurnResult['actions'] = [];
    const savedActions: AgentActionRecord[] = [];
    const savedMessages: AgentMessageRecord[] = [];

    let currentSession = session;

    for (const agent of currentSession.agents) {
      const context = this.agentTurnContextFactory.build(
        currentSession,
        agent.id,
        turnNumber,
        recentMessages,
        recentActions,
      );

      const action = await this.agentGateway.decideNextAction(context);
      const { recipientAgentId, relatedProposalActionId } =
        this.agentActionValidator.validate(
          currentSession,
          agent.id,
          action,
          recentActions,
        );
      const execution = await this.agentActionExecutor.execute({
        session: currentSession,
        agentId: agent.id,
        turnNumber,
        action,
        recipientAgentId,
        relatedProposalActionId,
      });

      currentSession = execution.updatedSession;
      recentActions.push(execution.savedAction);
      savedActions.push(execution.savedAction);

      if (execution.savedMessage) {
        recentMessages.push(execution.savedMessage);
        savedMessages.push(execution.savedMessage);
      }

      if (action.type !== 'finalize_turn') {
        this.agentSessionEventStreamService.publish({
          type: 'action_progressed',
          gameSessionId: currentSession.id,
          roundNumber: currentSession.currentRound,
          turnNumber,
          agentId: agent.id,
          agentName: agent.name,
          actionType: action.type,
          messageId: execution.savedMessage?.id,
          messageVisibility: execution.savedMessage?.visibility,
          occurredAt: new Date().toISOString(),
        });
      }

      actions.push({
        agentId: agent.id,
        agentName: agent.name,
        action,
      });
    }

    return {
      gameSessionId: currentSession.id,
      roundNumber: currentSession.currentRound,
      turnNumber,
      actions,
      actionRecords: savedActions,
      messages: savedMessages,
    };
  }
}
