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

function isPendingTransferProposalForAgent(
  action: AgentActionRecord,
  agentId: string,
  recentActions: AgentActionRecord[],
): boolean {
  if (
    !isTransferProposalActionType(action.actionType) ||
    action.recipientAgentId !== agentId ||
    !action.id
  ) {
    return false;
  }

  return !recentActions.some(
    (candidate) =>
      candidate.relatedProposalActionId === action.id &&
      isTransferProposalResolutionType(candidate.actionType),
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

function findActionableProposalsForAgent(
  agentId: string,
  session: Awaited<ReturnType<GameSessionRepositoryPort['findById']>>,
  recentActions: AgentActionRecord[],
) {
  return recentActions
    .filter((action) =>
      isPendingTransferProposalForAgent(action, agentId, recentActions),
    )
    .map((action) => ({
      proposalActionId: action.id ?? 'pending-action',
      proposerAgentId: action.agentId,
      proposerName:
        session?.agents.find((candidate) => candidate.id === action.agentId)
          ?.name ?? 'Unknown Agent',
      amount: action.amount ?? '0.0000',
      rationale: action.content ?? 'No rationale provided.',
    }));
}

function findPrimaryCounterparty(
  session: Awaited<ReturnType<GameSessionRepositoryPort['findById']>>,
  agentId: string,
  role: AgentTurnContext['self']['role'],
) {
  if (role === 'banker') {
    return (
      session?.agents.find((candidate) => candidate.role === 'trader') ?? null
    );
  }

  if (role === 'trader') {
    return (
      session?.agents.find((candidate) => candidate.role === 'banker') ?? null
    );
  }

  return null;
}

function countPrivateMessagesBetweenAgents(
  recentMessages: AgentMessageRecord[],
  firstAgentId: string,
  secondAgentId: string,
): number {
  return recentMessages.filter(
    (message) =>
      message.visibility === 'private' &&
      ((message.senderAgentId === firstAgentId &&
        message.recipientAgentId === secondAgentId) ||
        (message.senderAgentId === secondAgentId &&
          message.recipientAgentId === firstAgentId)),
  ).length;
}

function hasUnresolvedProposalBetweenAgents(
  recentActions: AgentActionRecord[],
  firstAgentId: string,
  secondAgentId: string,
): boolean {
  return recentActions.some(
    (action) =>
      isTransferProposalActionType(action.actionType) &&
      Boolean(action.id) &&
      ((action.agentId === firstAgentId &&
        action.recipientAgentId === secondAgentId) ||
        (action.agentId === secondAgentId &&
          action.recipientAgentId === firstAgentId)) &&
      !recentActions.some(
        (candidate) =>
          candidate.relatedProposalActionId === action.id &&
          isTransferProposalResolutionType(candidate.actionType),
      ),
  );
}

function buildNegotiationState(
  session: Awaited<ReturnType<GameSessionRepositoryPort['findById']>>,
  agent: AgentTurnContext['self'],
  recentMessages: AgentMessageRecord[],
  recentActions: AgentActionRecord[],
) {
  const primaryCounterparty = findPrimaryCounterparty(
    session,
    agent.agentId,
    agent.role,
  );

  if (!primaryCounterparty) {
    return {
      primaryCounterpartyAgentId: null,
      primaryCounterpartyName: null,
      privateMessageExchangeCountWithPrimaryCounterparty: 0,
      unresolvedProposalExistsWithPrimaryCounterparty: false,
      conversationLikelyReadyForProposal: false,
      guidance:
        'No primary capital counterparty is defined for your role, so focus on information advantage unless a concrete opportunity emerges.',
    };
  }

  const privateMessageExchangeCountWithPrimaryCounterparty =
    countPrivateMessagesBetweenAgents(
      recentMessages,
      agent.agentId,
      primaryCounterparty.id,
    );
  const unresolvedProposalExistsWithPrimaryCounterparty =
    hasUnresolvedProposalBetweenAgents(
      recentActions,
      agent.agentId,
      primaryCounterparty.id,
    );
  const conversationLikelyReadyForProposal =
    (agent.role === 'banker' || agent.role === 'trader') &&
    privateMessageExchangeCountWithPrimaryCounterparty >= 2 &&
    !unresolvedProposalExistsWithPrimaryCounterparty;

  return {
    primaryCounterpartyAgentId: primaryCounterparty.id,
    primaryCounterpartyName: primaryCounterparty.name,
    privateMessageExchangeCountWithPrimaryCounterparty,
    unresolvedProposalExistsWithPrimaryCounterparty,
    conversationLikelyReadyForProposal,
    guidance: conversationLikelyReadyForProposal
      ? 'You have an active bilateral negotiation with your primary capital counterparty and no unresolved proposal is open. If terms are aligned, an executable transfer proposal may now be higher value than another exploratory message.'
      : unresolvedProposalExistsWithPrimaryCounterparty
        ? 'A proposal already exists with your primary capital counterparty, so response or follow-through is usually higher value than starting a fresh negotiation loop.'
        : 'You are still in information-gathering or term-discovery mode with your primary capital counterparty.',
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
        actionableProposalsForSelf: findActionableProposalsForAgent(
          agent.id,
          session,
          recentActions,
        ),
        negotiationState: buildNegotiationState(
          session,
          {
            agentId: agent.id,
            name: agent.name,
            role: agent.role,
            availableBalance: agent.balance.available.toDecimal(),
            depositPrincipal: agent.depositAccount.principal.toDecimal(),
          },
          recentMessages,
          recentActions,
        ),
        economicContext: {
          objective:
            'Maximize your own expected fake-money outcome. Use communication, proposals, and responses when they improve your expected position.',
          messagesDoNotMoveMoney: true,
          proposalsCanMoveMoney: true,
          acceptedProposalChangesBalances: true,
          finalizeDoesNotChangeState: true,
          unresolvedIncomingProposalCount: recentActions.filter((action) =>
            isPendingTransferProposalForAgent(action, agent.id, recentActions),
          ).length,
          unresolvedOutgoingProposalCount: recentActions.filter(
            (action) =>
              isTransferProposalActionType(action.actionType) &&
              action.agentId === agent.id &&
              Boolean(action.id) &&
              !recentActions.some(
                (candidate) =>
                  candidate.relatedProposalActionId === action.id &&
                  isTransferProposalResolutionType(candidate.actionType),
              ),
          ).length,
        },
        actionSemantics: {
          sendPublicMessage:
            'Shares public information or narrative. Does not move money directly.',
          sendPrivateMessage:
            'Opens or continues a bilateral negotiation. Does not move money directly.',
          proposeDirectTransfer:
            'Creates a concrete executable transfer proposal with an amount for the counterparty to accept, reject, or counter.',
          counterDirectTransferProposal:
            'Replaces a pending transfer proposal with a new executable amount back to the original proposer.',
          acceptDirectTransferProposal:
            'Accepts a pending transfer proposal so it can execute and change balances.',
          rejectDirectTransferProposal:
            'Closes a pending transfer proposal without changing balances.',
          finalizeTurn:
            'Take no further action this turn. This does not move money or improve information by itself.',
        },
      };

      const action = await this.agentGateway.decideNextAction(context);
      const recipientAgentId =
        action.type === 'send_private_message' ||
        action.type === 'propose_direct_transfer' ||
        action.type === 'counter_direct_transfer_proposal'
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

      if (
        action.type === 'propose_direct_transfer' ||
        action.type === 'counter_direct_transfer_proposal'
      ) {
        Money.fromDecimal(action.amount);
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
        gameSessionId: session.id,
        roundNumber: session.currentRound,
        turnNumber,
        agentId: agent.id,
        recipientAgentId,
        relatedProposalActionId,
        actionType: action.type,
        amount:
          action.type === 'propose_direct_transfer' ||
          action.type === 'counter_direct_transfer_proposal'
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
