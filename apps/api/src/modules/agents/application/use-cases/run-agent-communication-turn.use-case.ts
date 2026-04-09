import type { AgentAction } from '@llm-sim/mcp-contracts';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { GameSessionRepositoryPort } from '../../../game/application/ports/game-session-repository.port.js';
import type { PlaceFundsWithBankerUseCase } from '../../../game/application/use-cases/place-funds-with-banker.use-case.js';
import type { RedeemFundsFromBankerUseCase } from '../../../game/application/use-cases/redeem-funds-from-banker.use-case.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
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
import { AgentTurnContextFactory } from '../services/agent-turn-context.factory.js';

function isTransferProposalActionType(
  actionType: AgentActionRecord['actionType'],
): actionType is
  | 'propose_direct_transfer'
  | 'counter_direct_transfer_proposal' {
  return (
    actionType === 'propose_direct_transfer' ||
    actionType === 'counter_direct_transfer_proposal'
  );
}

function isTransferProposalResolutionType(
  actionType: AgentActionRecord['actionType'],
): actionType is
  | 'counter_direct_transfer_proposal'
  | 'accept_direct_transfer_proposal'
  | 'reject_direct_transfer_proposal' {
  return (
    actionType === 'counter_direct_transfer_proposal' ||
    actionType === 'accept_direct_transfer_proposal' ||
    actionType === 'reject_direct_transfer_proposal'
  );
}

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

function wouldSettleAsBankerFundingTrader(
  session: NonNullable<
    Awaited<ReturnType<GameSessionRepositoryPort['findById']>>
  >,
  proposerAgentId: string,
  recipientAgentId: string,
): boolean {
  const proposer = session.agents.find((agent) => agent.id === proposerAgentId);
  const recipient = session.agents.find(
    (agent) => agent.id === recipientAgentId,
  );

  return proposer?.role === 'trader' && recipient?.role === 'banker';
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
    private readonly agentTurnContextFactory = new AgentTurnContextFactory(),
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
      const recipientAgentId =
        action.type === 'send_private_message' ||
        action.type === 'propose_direct_transfer' ||
        action.type === 'counter_direct_transfer_proposal' ||
        action.type === 'place_funds_with_banker' ||
        action.type === 'redeem_funds_from_banker'
          ? action.recipientAgentId
          : action.type === 'accept_direct_transfer_proposal' ||
              action.type === 'reject_direct_transfer_proposal'
            ? null
            : null;

      if (recipientAgentId) {
        const recipientAgent = currentSession.agents.find(
          (candidate) => candidate.id === recipientAgentId,
        );

        if (!recipientAgent || recipientAgent.id === agent.id) {
          throw new DomainInvariantError(
            'Agent communication target must be another agent in the same game session.',
          );
        }
      }

      if (
        action.type === 'propose_direct_transfer' ||
        action.type === 'counter_direct_transfer_proposal' ||
        action.type === 'place_funds_with_banker' ||
        action.type === 'redeem_funds_from_banker'
      ) {
        Money.fromDecimal(action.amount);
      }

      if (
        (action.type === 'propose_direct_transfer' ||
          action.type === 'counter_direct_transfer_proposal') &&
        recipientAgentId &&
        wouldSettleAsBankerFundingTrader(
          currentSession,
          agent.id,
          recipientAgentId,
        )
      ) {
        throw new DomainInvariantError(
          'Banker-to-trader funding proposals are not supported yet. Use custody actions for banker/trader treasury flows.',
        );
      }

      if (
        action.type === 'place_funds_with_banker' ||
        action.type === 'redeem_funds_from_banker'
      ) {
        const bankerAgent = currentSession.agents.find(
          (candidate) => candidate.id === recipientAgentId,
        );

        if (!bankerAgent || bankerAgent.role !== 'banker') {
          throw new DomainInvariantError(
            'Custody actions must target a banker in the same game session.',
          );
        }
      }

      let relatedProposalActionId: string | undefined;

      if (
        action.type === 'counter_direct_transfer_proposal' ||
        action.type === 'accept_direct_transfer_proposal' ||
        action.type === 'reject_direct_transfer_proposal'
      ) {
        const proposal = recentActions.find(
          (candidate) =>
            candidate.id === action.proposalActionId &&
            isTransferProposalActionType(candidate.actionType),
        );

        if (!proposal) {
          throw new DomainInvariantError(
            'Proposal response must reference an existing transfer proposal.',
          );
        }

        if (proposal.recipientAgentId !== agent.id) {
          throw new DomainInvariantError(
            'Only the proposal recipient may accept or reject a transfer proposal.',
          );
        }

        const existingResponse = recentActions.find(
          (candidate) =>
            candidate.relatedProposalActionId === proposal.id &&
            isTransferProposalResolutionType(candidate.actionType),
        );

        if (existingResponse) {
          throw new DomainInvariantError(
            'Transfer proposal has already been resolved.',
          );
        }

        if (
          action.type === 'counter_direct_transfer_proposal' &&
          action.recipientAgentId !== proposal.agentId
        ) {
          throw new DomainInvariantError(
            'Counter-proposal recipient must match the original proposal sender.',
          );
        }

        relatedProposalActionId = proposal.id;
      }

      const savedAction = await this.agentActionRepository.save({
        gameSessionId: currentSession.id,
        roundNumber: currentSession.currentRound,
        turnNumber,
        agentId: agent.id,
        recipientAgentId,
        relatedProposalActionId,
        actionType: action.type,
        amount:
          action.type === 'propose_direct_transfer' ||
          action.type === 'counter_direct_transfer_proposal' ||
          action.type === 'place_funds_with_banker' ||
          action.type === 'redeem_funds_from_banker'
            ? action.amount
            : undefined,
        content:
          action.type === 'send_public_message' ||
          action.type === 'send_private_message'
            ? action.content
            : action.type === 'propose_direct_transfer' ||
                action.type === 'counter_direct_transfer_proposal'
              ? action.rationale
              : action.type === 'reject_direct_transfer_proposal'
                ? action.rationale
                : undefined,
      });

      recentActions.push(savedAction);
      savedActions.push(savedAction);
      let savedMessage: AgentMessageRecord | undefined;

      if (action.type === 'place_funds_with_banker') {
        currentSession = await this.placeFundsWithBankerUseCase.execute({
          gameSessionId: currentSession.id,
          ownerAgentId: agent.id,
          bankerAgentId: recipientAgentId!,
          amount: action.amount,
        });
      }

      if (action.type === 'redeem_funds_from_banker') {
        currentSession = await this.redeemFundsFromBankerUseCase.execute({
          gameSessionId: currentSession.id,
          ownerAgentId: agent.id,
          bankerAgentId: recipientAgentId!,
          amount: action.amount,
        });
      }

      if (action.type === 'send_private_message') {
        savedMessage = await this.agentMessageRepository.save({
          gameSessionId: currentSession.id,
          roundNumber: currentSession.currentRound,
          turnNumber,
          senderAgentId: agent.id,
          recipientAgentId,
          visibility: 'private',
          content: action.content,
        });

        recentMessages.push(savedMessage);
        savedMessages.push(savedMessage);
      }

      if (action.type === 'send_public_message') {
        savedMessage = await this.agentMessageRepository.save({
          gameSessionId: currentSession.id,
          roundNumber: currentSession.currentRound,
          turnNumber,
          senderAgentId: agent.id,
          recipientAgentId: null,
          visibility: 'public',
          content: action.content,
        });

        recentMessages.push(savedMessage);
        savedMessages.push(savedMessage);
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
          messageId: savedMessage?.id,
          messageVisibility: savedMessage?.visibility,
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
