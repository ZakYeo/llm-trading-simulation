import type {
  AgentAction,
  RecentAgentAction,
  AgentTurnContext,
  RecentAgentMessage,
} from '@llm-sim/mcp-contracts';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { GameSessionRepositoryPort } from '../../../game/application/ports/game-session-repository.port.js';
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

function toRecentMessage(
  message: AgentMessageRecord,
  senderName: string,
): RecentAgentMessage {
  return {
    senderAgentId: message.senderAgentId,
    senderName,
    recipientAgentId: message.recipientAgentId,
    visibility: message.visibility,
    content: message.content,
  };
}

function toRecentAction(
  action: AgentActionRecord,
  agentName: string,
): RecentAgentAction {
  return {
    actionId: action.id ?? 'pending-action',
    agentId: action.agentId,
    agentName,
    recipientAgentId: action.recipientAgentId,
    type: action.actionType,
    amount: action.amount,
    content: action.content,
    relatedProposalActionId: action.relatedProposalActionId,
    roundNumber: action.roundNumber,
    turnNumber: action.turnNumber,
  };
}

export class RunAgentCommunicationTurnUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepositoryPort,
    private readonly agentMessageRepository: AgentMessageRepositoryPort,
    private readonly agentActionRepository: AgentActionRepositoryPort,
    private readonly agentGateway: AgentGatewayPort,
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

    for (const agent of session.agents) {
      const context: AgentTurnContext = {
        gameId: session.id,
        sessionName: session.name,
        round: session.currentRound,
        turnNumber,
        self: {
          agentId: agent.id,
          name: agent.name,
          role: agent.role,
          availableBalance: agent.balance.available.toDecimal(),
          depositPrincipal: agent.depositAccount.principal.toDecimal(),
        },
        peers: session.agents
          .filter((peer) => peer.id !== agent.id)
          .map((peer) => ({
            agentId: peer.id,
            name: peer.name,
            role: peer.role,
          })),
        recentMessages: recentMessages.map((message) => {
          const senderName =
            session.agents.find(
              (candidate) => candidate.id === message.senderAgentId,
            )?.name ?? 'Unknown Agent';

          return toRecentMessage(message, senderName);
        }),
        recentActions: recentActions.map((action) => {
          const agentName =
            session.agents.find((candidate) => candidate.id === action.agentId)
              ?.name ?? 'Unknown Agent';

          return toRecentAction(action, agentName);
        }),
      };

      const action = await this.agentGateway.decideNextAction(context);
      const recipientAgentId =
        action.type === 'send_private_message' ||
        action.type === 'propose_direct_transfer'
          ? action.recipientAgentId
          : action.type === 'accept_direct_transfer_proposal' ||
              action.type === 'reject_direct_transfer_proposal'
            ? null
            : null;

      if (recipientAgentId) {
        const recipientAgent = session.agents.find(
          (candidate) => candidate.id === recipientAgentId,
        );

        if (!recipientAgent || recipientAgent.id === agent.id) {
          throw new DomainInvariantError(
            'Agent communication target must be another agent in the same game session.',
          );
        }
      }

      if (action.type === 'propose_direct_transfer') {
        Money.fromDecimal(action.amount);
      }

      let relatedProposalActionId: string | undefined;

      if (
        action.type === 'accept_direct_transfer_proposal' ||
        action.type === 'reject_direct_transfer_proposal'
      ) {
        const proposal = recentActions.find(
          (candidate) =>
            candidate.id === action.proposalActionId &&
            candidate.actionType === 'propose_direct_transfer',
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
            (candidate.actionType === 'accept_direct_transfer_proposal' ||
              candidate.actionType === 'reject_direct_transfer_proposal'),
        );

        if (existingResponse) {
          throw new DomainInvariantError(
            'Transfer proposal has already been resolved.',
          );
        }

        relatedProposalActionId = proposal.id;
      }

      const savedAction = await this.agentActionRepository.save({
        gameSessionId: session.id,
        roundNumber: session.currentRound,
        turnNumber,
        agentId: agent.id,
        recipientAgentId,
        relatedProposalActionId,
        actionType: action.type,
        amount:
          action.type === 'propose_direct_transfer' ? action.amount : undefined,
        content:
          action.type === 'send_public_message' ||
          action.type === 'send_private_message'
            ? action.content
            : action.type === 'propose_direct_transfer'
              ? action.rationale
              : action.type === 'reject_direct_transfer_proposal'
                ? action.rationale
                : undefined,
      });

      recentActions.push(savedAction);
      savedActions.push(savedAction);

      if (action.type === 'send_private_message') {
        const savedMessage = await this.agentMessageRepository.save({
          gameSessionId: session.id,
          roundNumber: session.currentRound,
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
        const savedMessage = await this.agentMessageRepository.save({
          gameSessionId: session.id,
          roundNumber: session.currentRound,
          turnNumber,
          senderAgentId: agent.id,
          recipientAgentId: null,
          visibility: 'public',
          content: action.content,
        });

        recentMessages.push(savedMessage);
        savedMessages.push(savedMessage);
      }

      actions.push({
        agentId: agent.id,
        agentName: agent.name,
        action,
      });
    }

    return {
      gameSessionId: session.id,
      roundNumber: session.currentRound,
      turnNumber,
      actions,
      actionRecords: savedActions,
      messages: savedMessages,
    };
  }
}
