import type { AgentAction } from '@llm-sim/mcp-contracts';

import type { GameSessionRepositoryPort } from '../../../game/application/ports/game-session-repository.port.js';
import type { PlaceFundsWithBankerUseCase } from '../../../game/application/use-cases/place-funds-with-banker.use-case.js';
import type { RedeemFundsFromBankerUseCase } from '../../../game/application/use-cases/redeem-funds-from-banker.use-case.js';
import type {
  AgentActionRecord,
  AgentActionRepositoryPort,
} from '../ports/agent-action-repository.port.js';
import type {
  AgentMessageRecord,
  AgentMessageRepositoryPort,
} from '../ports/agent-message-repository.port.js';

export interface ExecuteAgentActionInput {
  session: NonNullable<
    Awaited<ReturnType<GameSessionRepositoryPort['findById']>>
  >;
  agentId: string;
  turnNumber: number;
  action: AgentAction;
  recipientAgentId: string | null;
  relatedProposalActionId?: string;
}

export interface ExecuteAgentActionResult {
  updatedSession: NonNullable<
    Awaited<ReturnType<GameSessionRepositoryPort['findById']>>
  >;
  savedAction: AgentActionRecord;
  savedMessage?: AgentMessageRecord;
}

export class AgentActionExecutor {
  constructor(
    private readonly agentMessageRepository: AgentMessageRepositoryPort,
    private readonly agentActionRepository: AgentActionRepositoryPort,
    private readonly placeFundsWithBankerUseCase: PlaceFundsWithBankerUseCase,
    private readonly redeemFundsFromBankerUseCase: RedeemFundsFromBankerUseCase,
  ) {}

  async execute(
    input: ExecuteAgentActionInput,
  ): Promise<ExecuteAgentActionResult> {
    const savedAction = await this.agentActionRepository.save({
      gameSessionId: input.session.id,
      roundNumber: input.session.currentRound,
      turnNumber: input.turnNumber,
      agentId: input.agentId,
      recipientAgentId: input.recipientAgentId,
      relatedProposalActionId: input.relatedProposalActionId,
      actionType: input.action.type,
      amount:
        input.action.type === 'request_payment' ||
        input.action.type === 'counter_payment_request' ||
        input.action.type === 'place_funds_with_banker' ||
        input.action.type === 'redeem_funds_from_banker'
          ? input.action.amount
          : undefined,
      content:
        input.action.type === 'send_public_message' ||
        input.action.type === 'send_private_message'
          ? input.action.content
          : input.action.type === 'request_payment' ||
              input.action.type === 'counter_payment_request'
            ? input.action.rationale
            : input.action.type === 'reject_payment_request'
              ? input.action.rationale
              : undefined,
    });

    let updatedSession = input.session;

    if (input.action.type === 'place_funds_with_banker') {
      updatedSession = await this.placeFundsWithBankerUseCase.execute({
        gameSessionId: input.session.id,
        ownerAgentId: input.agentId,
        bankerAgentId: input.recipientAgentId!,
        amount: input.action.amount,
      });
    }

    if (input.action.type === 'redeem_funds_from_banker') {
      updatedSession = await this.redeemFundsFromBankerUseCase.execute({
        gameSessionId: input.session.id,
        ownerAgentId: input.agentId,
        bankerAgentId: input.recipientAgentId!,
        amount: input.action.amount,
      });
    }

    let savedMessage: AgentMessageRecord | undefined;

    if (input.action.type === 'send_private_message') {
      savedMessage = await this.agentMessageRepository.save({
        gameSessionId: updatedSession.id,
        roundNumber: updatedSession.currentRound,
        turnNumber: input.turnNumber,
        senderAgentId: input.agentId,
        recipientAgentId: input.recipientAgentId,
        visibility: 'private',
        content: input.action.content,
      });
    }

    if (input.action.type === 'send_public_message') {
      savedMessage = await this.agentMessageRepository.save({
        gameSessionId: updatedSession.id,
        roundNumber: updatedSession.currentRound,
        turnNumber: input.turnNumber,
        senderAgentId: input.agentId,
        recipientAgentId: null,
        visibility: 'public',
        content: input.action.content,
      });
    }

    return {
      updatedSession,
      savedAction,
      savedMessage,
    };
  }
}
