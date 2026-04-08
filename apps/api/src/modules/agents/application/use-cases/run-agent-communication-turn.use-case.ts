import type {
  AgentAction,
  AgentTurnContext,
  RecentAgentMessage,
} from '@llm-sim/mcp-contracts';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { GameSessionRepositoryPort } from '../../../game/application/ports/game-session-repository.port.js';
import type { AgentGatewayPort } from '../ports/agent-gateway.port.js';
import type {
  AgentMessageRecord,
  AgentMessageRepositoryPort,
} from '../ports/agent-message-repository.port.js';

export interface RunAgentCommunicationTurnInput {
  gameSessionId: string;
}

export interface RunAgentCommunicationTurnResult {
  gameSessionId: string;
  roundNumber: number;
  actions: Array<{
    agentId: string;
    agentName: string;
    action: AgentAction;
  }>;
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

export class RunAgentCommunicationTurnUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepositoryPort,
    private readonly agentMessageRepository: AgentMessageRepositoryPort,
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

    const recentMessages =
      await this.agentMessageRepository.findRecentByGameSessionId(
        session.id,
        20,
      );
    const actions: RunAgentCommunicationTurnResult['actions'] = [];
    const savedMessages: AgentMessageRecord[] = [];

    for (const agent of session.agents) {
      const context: AgentTurnContext = {
        gameId: session.id,
        sessionName: session.name,
        round: session.currentRound,
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
      };

      const action = await this.agentGateway.decideNextAction(context);

      if (action.type === 'send_private_message') {
        const recipientAgent = session.agents.find(
          (candidate) => candidate.id === action.recipientAgentId,
        );

        if (!recipientAgent || recipientAgent.id === agent.id) {
          throw new DomainInvariantError(
            'Agent communication target must be another agent in the same game session.',
          );
        }

        const savedMessage = await this.agentMessageRepository.save({
          gameSessionId: session.id,
          roundNumber: session.currentRound,
          senderAgentId: agent.id,
          recipientAgentId: recipientAgent.id,
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
      actions,
      messages: savedMessages,
    };
  }
}
