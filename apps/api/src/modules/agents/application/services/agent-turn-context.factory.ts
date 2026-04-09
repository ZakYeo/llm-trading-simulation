import type {
  AgentTurnContext,
  RecentAgentAction,
  RecentAgentMessage,
} from '@llm-sim/mcp-contracts';

import type { GameSessionRepositoryPort } from '../../../game/application/ports/game-session-repository.port.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { AgentActionRecord } from '../ports/agent-action-repository.port.js';
import type { AgentMessageRecord } from '../ports/agent-message-repository.port.js';

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
  session: NonNullable<
    Awaited<ReturnType<GameSessionRepositoryPort['findById']>>
  >,
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
        session.agents.find((candidate) => candidate.id === action.agentId)
          ?.name ?? 'Unknown Agent',
      amount: action.amount ?? '0.0000',
      rationale: action.content ?? 'No rationale provided.',
    }));
}

function findPrimaryCounterparty(
  session: NonNullable<
    Awaited<ReturnType<GameSessionRepositoryPort['findById']>>
  >,
  agentId: string,
  role: AgentTurnContext['self']['role'],
) {
  if (role === 'banker') {
    return (
      session.agents.find((candidate) => candidate.role === 'trader') ?? null
    );
  }

  if (role === 'trader') {
    return (
      session.agents.find((candidate) => candidate.role === 'banker') ?? null
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
  session: NonNullable<
    Awaited<ReturnType<GameSessionRepositoryPort['findById']>>
  >,
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

function buildTreasuryContext(
  session: NonNullable<
    Awaited<ReturnType<GameSessionRepositoryPort['findById']>>
  >,
  agentId: string,
) {
  const banker = session.agents.find(
    (candidate) => candidate.role === 'banker',
  );
  const totalCustodiedPrincipal = session.bankerCustodyPositions.reduce(
    (total, position) => total.add(position.principal),
    Money.zero(),
  );
  const totalCustodiedAccruedInterest = session.bankerCustodyPositions.reduce(
    (total, position) => total.add(position.accruedInterest),
    Money.zero(),
  );
  const selfCustodyPosition = banker
    ? (session.bankerCustodyPositions.find(
        (position) =>
          position.bankerAgentId === banker.id &&
          position.ownerAgentId === agentId,
      ) ?? null)
    : null;

  return {
    bankerAgentId: banker?.id ?? null,
    bankerName: banker?.name ?? null,
    totalCustodiedPrincipal: totalCustodiedPrincipal.toDecimal(),
    totalCustodiedAccruedInterest: totalCustodiedAccruedInterest.toDecimal(),
    totalCustodiedBalance: totalCustodiedPrincipal
      .add(totalCustodiedAccruedInterest)
      .toDecimal(),
    selfCustodyPosition: selfCustodyPosition
      ? {
          bankerAgentId: selfCustodyPosition.bankerAgentId,
          principal: selfCustodyPosition.principal.toDecimal(),
          accruedInterest: selfCustodyPosition.accruedInterest.toDecimal(),
          totalBalance: selfCustodyPosition.totalBalance().toDecimal(),
        }
      : null,
    obligationsForBanker:
      banker?.id === agentId
        ? session.bankerCustodyPositions.map((position) => ({
            ownerAgentId: position.ownerAgentId,
            ownerName:
              session.agents.find(
                (candidate) => candidate.id === position.ownerAgentId,
              )?.name ?? 'Unknown Agent',
            principal: position.principal.toDecimal(),
            accruedInterest: position.accruedInterest.toDecimal(),
            totalBalance: position.totalBalance().toDecimal(),
          }))
        : [],
  };
}

export class AgentTurnContextFactory {
  build(
    session: NonNullable<
      Awaited<ReturnType<GameSessionRepositoryPort['findById']>>
    >,
    agentId: string,
    turnNumber: number,
    recentMessages: AgentMessageRecord[],
    recentActions: AgentActionRecord[],
  ): AgentTurnContext {
    const agent = session.agents.find((candidate) => candidate.id === agentId);

    if (!agent) {
      throw new Error('Agent must exist in the session to build context.');
    }

    const self = {
      agentId: agent.id,
      name: agent.name,
      role: agent.role,
      availableBalance: agent.balance.available.toDecimal(),
      depositPrincipal: agent.depositAccount.principal.toDecimal(),
    } satisfies AgentTurnContext['self'];

    return {
      gameId: session.id,
      sessionName: session.name,
      round: session.currentRound,
      turnNumber,
      self,
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
        self,
        recentMessages,
        recentActions,
      ),
      treasuryContext: buildTreasuryContext(session, agent.id),
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
          'Creates a concrete executable payment request where the recipient would pay the proposer if accepted.',
        counterDirectTransferProposal:
          'Replaces a pending payment request with a new executable amount back to the original proposer.',
        acceptDirectTransferProposal:
          'Accepts a pending payment request so it can execute and change balances.',
        rejectDirectTransferProposal:
          'Closes a pending payment request without changing balances.',
        placeFundsWithBanker:
          'Moves your own available balance into banker custody with the targeted banker agent. Use recipientAgentId as the banker id.',
        redeemFundsFromBanker:
          'Redeems your own custodial balance back from the targeted banker agent. Use recipientAgentId as the banker id.',
        finalizeTurn:
          'Take no further action this turn. This does not move money or improve information by itself.',
      },
    };
  }
}
