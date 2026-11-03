import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';

import type {
  AgentGatewayPort,
  AgentMessageStreamCallbacks,
} from '../../application/ports/agent-gateway.port.js';

export class MockAgentGateway implements AgentGatewayPort {
  async decideNextAction(
    context: AgentTurnContext,
    callbacks?: AgentMessageStreamCallbacks,
  ): Promise<AgentAction> {
    const action = await this.decideScriptedAction(context, callbacks);
    return context.self.role === 'trader'
      ? {
          ...action,
          decisionExplanation: `Scripted mock decision: ${action.type}. Personality values are displayed for inspection but do not drive this deterministic script.`,
        }
      : action;
  }
  private async decideScriptedAction(
    context: AgentTurnContext,
    callbacks?: AgentMessageStreamCallbacks,
  ): Promise<AgentAction> {
    const scenario = process.env.AGENT_MOCK_SCENARIO;
    const banker = context.peers.find((peer) => peer.role === 'banker');
    const trader = context.peers.find((peer) => peer.role === 'trader');
    const analyst = context.peers.find((peer) => peer.role === 'analyst');
    const riskyOpportunity = context.marketContext.visibleOpportunities.find(
      (opportunity) =>
        opportunity.riskLevel === 'high' &&
        opportunity.estimatedNetReturnBps > 0,
    );
    const ownCustodyPosition = context.treasuryContext.selfCustodyPosition;
    const pendingProposal = context.recentActions.find((action) => {
      if (
        (action.type !== 'request_payment' &&
          action.type !== 'counter_payment_request') ||
        action.recipientAgentId !== context.self.agentId
      ) {
        return false;
      }

      return !context.recentActions.some(
        (candidate) =>
          (candidate.type === 'counter_payment_request' ||
            candidate.type === 'accept_payment_request' ||
            candidate.type === 'reject_payment_request') &&
          candidate.relatedProposalActionId === action.actionId,
      );
    });
    const negotiations = context.depositNegotiations ?? [];
    const request = negotiations.find(
      (o) =>
        o.kind === 'request' &&
        o.bankerAgentId === context.self.agentId &&
        o.roundNumber === context.round &&
        o.status === 'pending' &&
        !negotiations.some((q) => q.requestId === o.id),
    );
    if (context.self.role === 'banker' && request)
      return {
        type: 'send_private_message',
        recipientAgentId: request.traderAgentId,
        content: `I can offer 1.5% per round on ${request.amount} SIM, with flexible withdrawal.`,
        depositTerms: {
          requestId: request.id,
          offerAmount: request.amount,
          rateBps: 150,
        },
      };
    if (
      context.self.role === 'trader' &&
      banker &&
      !ownCustodyPosition &&
      (scenario !== 'market_opportunity' ||
        context.marketContext.selfOpenPositions.length > 0)
    ) {
      const offer = negotiations.find(
        (o) =>
          o.kind === 'offer' &&
          o.traderAgentId === context.self.agentId &&
          o.roundNumber === context.round &&
          o.status === 'pending',
      );
      if (offer)
        return {
          type: 'place_funds_with_banker',
          recipientAgentId: offer.bankerAgentId,
          amount: offer.amount,
          offerId: offer.id,
        };
      if (
        !negotiations.some(
          (o) =>
            o.kind === 'request' &&
            o.traderAgentId === context.self.agentId &&
            o.roundNumber === context.round &&
            o.status === 'pending',
        )
      )
        return {
          type: 'send_private_message',
          recipientAgentId: banker.agentId,
          content:
            'I am considering depositing 10 SIM. What interest would I earn per round?',
          depositTerms: { requestAmount: '10' },
        };
    }

    if (
      context.self.role === 'trader' &&
      scenario === 'market_opportunity' &&
      riskyOpportunity &&
      context.marketContext.selfOpenPositions.length === 0 &&
      context.turnNumber === 1
    ) {
      return {
        type: 'open_market_position',
        opportunityId: riskyOpportunity.opportunityId,
        amount: riskyOpportunity.minCommitment,
      };
    }

    if (
      (scenario === 'reject_proposal' || scenario === 'counter_proposal') &&
      context.self.role === 'analyst' &&
      trader &&
      context.turnNumber === 2 &&
      !pendingProposal
    ) {
      return {
        type: 'request_payment',
        recipientAgentId: trader.agentId,
        amount: '12.5000',
        rationale: 'Settle the analysis fee before I disclose the full signal.',
      };
    }

    if (
      context.self.role === 'trader' &&
      context.turnNumber >= 3 &&
      pendingProposal
    ) {
      if (scenario === 'reject_proposal') {
        return {
          type: 'reject_payment_request',
          proposalActionId: pendingProposal.actionId,
          rationale: 'The proposed transfer is too risky for this round.',
        };
      }

      if (scenario === 'counter_proposal') {
        return {
          type: 'counter_payment_request',
          proposalActionId: pendingProposal.actionId,
          recipientAgentId: analyst?.agentId ?? pendingProposal.agentId,
          amount: '8.5000',
          rationale: 'I will settle, but only at a reduced fee.',
        };
      }

      return {
        type: 'accept_payment_request',
        proposalActionId: pendingProposal.actionId,
      };
    }

    if (
      context.self.role === 'trader' &&
      banker &&
      context.turnNumber >= 3 &&
      ownCustodyPosition &&
      ownCustodyPosition.totalBalance !== '0.0000'
    ) {
      return {
        type: 'redeem_funds_from_banker',
        recipientAgentId: banker.agentId,
        amount:
          ownCustodyPosition.accruedInterest !== '0.0000'
            ? ownCustodyPosition.accruedInterest
            : '2.5000',
      };
    }

    if (
      context.self.role === 'analyst' &&
      scenario === 'counter_proposal' &&
      context.turnNumber >= 4 &&
      pendingProposal?.type === 'counter_payment_request'
    ) {
      return {
        type: 'accept_payment_request',
        proposalActionId: pendingProposal.actionId,
      };
    }

    if (context.self.role === 'analyst' && context.turnNumber === 2) {
      const action = {
        type: 'send_public_message',
        content: 'Volatility is compressing and timing risk is falling.',
      } satisfies AgentAction;

      streamMessageAction(action, callbacks);
      return action;
    }

    return {
      type: 'finalize_turn',
    };
  }
}

function streamMessageAction(
  action: AgentAction,
  callbacks?: AgentMessageStreamCallbacks,
) {
  if (
    !callbacks ||
    (action.type !== 'send_private_message' &&
      action.type !== 'send_public_message')
  ) {
    return;
  }

  const streamId = `mock-stream-${Math.random().toString(36).slice(2, 10)}`;
  const visibility =
    action.type === 'send_private_message' ? 'private' : 'public';
  const recipientAgentId =
    action.type === 'send_private_message' ? action.recipientAgentId : null;

  callbacks.onMessageStreamStarted({
    streamId,
    visibility,
    recipientAgentId,
  });

  const midpoint = Math.max(1, Math.ceil(action.content.length / 2));
  const chunks = [
    action.content.slice(0, midpoint),
    action.content.slice(midpoint),
  ].filter((chunk) => chunk.length > 0);
  let content = '';

  for (const chunk of chunks) {
    content += chunk;
    callbacks.onMessageStreamDelta({
      streamId,
      visibility,
      recipientAgentId,
      delta: chunk,
      content,
    });
  }

  callbacks.onMessageStreamCompleted({
    streamId,
    visibility,
    recipientAgentId,
    content: action.content,
  });
}
