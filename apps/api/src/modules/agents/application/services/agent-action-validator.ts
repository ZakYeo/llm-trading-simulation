import type { AgentAction } from '@llm-sim/mcp-contracts';

import type { GameSessionRepositoryPort } from '../../../game/application/ports/game-session-repository.port.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { AgentActionRecord } from '../ports/agent-action-repository.port.js';

function isTransferProposalActionType(
  actionType: AgentActionRecord['actionType'],
): actionType is 'request_payment' | 'counter_payment_request' {
  return (
    actionType === 'request_payment' || actionType === 'counter_payment_request'
  );
}

function isTransferProposalResolutionType(
  actionType: AgentActionRecord['actionType'],
): actionType is
  | 'counter_payment_request'
  | 'accept_payment_request'
  | 'reject_payment_request' {
  return (
    actionType === 'counter_payment_request' ||
    actionType === 'accept_payment_request' ||
    actionType === 'reject_payment_request'
  );
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

export interface ValidatedAgentAction {
  recipientAgentId: string | null;
  relatedProposalActionId?: string;
}

export class AgentActionValidator {
  validate(
    session: NonNullable<
      Awaited<ReturnType<GameSessionRepositoryPort['findById']>>
    >,
    agentId: string,
    action: AgentAction,
    recentActions: AgentActionRecord[],
  ): ValidatedAgentAction {
    const recipientAgentId =
      action.type === 'send_private_message' ||
      action.type === 'request_payment' ||
      action.type === 'counter_payment_request' ||
      action.type === 'place_funds_with_banker' ||
      action.type === 'redeem_funds_from_banker'
        ? action.recipientAgentId
        : null;

    if (recipientAgentId) {
      const recipientAgent = session.agents.find(
        (candidate) => candidate.id === recipientAgentId,
      );

      if (!recipientAgent || recipientAgent.id === agentId) {
        throw new DomainInvariantError(
          'Agent communication target must be another agent in the same game session.',
        );
      }
    }

    if (
      action.type === 'request_payment' ||
      action.type === 'counter_payment_request' ||
      action.type === 'place_funds_with_banker' ||
      action.type === 'redeem_funds_from_banker' ||
      action.type === 'open_market_position'
    ) {
      Money.fromDecimal(action.amount);
    }

    if (
      (action.type === 'request_payment' ||
        action.type === 'counter_payment_request') &&
      recipientAgentId &&
      wouldSettleAsBankerFundingTrader(session, agentId, recipientAgentId)
    ) {
      throw new DomainInvariantError(
        'Banker-to-trader funding proposals are not supported yet. Use custody actions for banker/trader treasury flows.',
      );
    }

    if (
      action.type === 'place_funds_with_banker' ||
      action.type === 'redeem_funds_from_banker'
    ) {
      const bankerAgent = session.agents.find(
        (candidate) => candidate.id === recipientAgentId,
      );

      if (!bankerAgent || bankerAgent.role !== 'banker') {
        throw new DomainInvariantError(
          'Custody actions must target a banker in the same game session.',
        );
      }
    }

    if (action.type === 'open_market_position') {
      const opportunity = session.marketOpportunities.find(
        (candidate) => candidate.id === action.opportunityId,
      );

      if (!opportunity) {
        throw new DomainInvariantError(
          'Market actions must reference an opportunity in the same game session.',
        );
      }
    }

    let relatedProposalActionId: string | undefined;

    if (
      action.type === 'counter_payment_request' ||
      action.type === 'accept_payment_request' ||
      action.type === 'reject_payment_request'
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

      if (proposal.recipientAgentId !== agentId) {
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
        action.type === 'counter_payment_request' &&
        action.recipientAgentId !== proposal.agentId
      ) {
        throw new DomainInvariantError(
          'Counter-proposal recipient must match the original proposal sender.',
        );
      }

      relatedProposalActionId = proposal.id;
    }

    return {
      recipientAgentId,
      relatedProposalActionId,
    };
  }
}
