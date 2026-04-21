import type {
  AgentToolCallParams,
  AgentTurnContext,
} from '@llm-sim/mcp-contracts';

import type {
  AgentGatewayPort,
  AgentMessageStreamCallbacks,
} from '../../application/ports/agent-gateway.port.js';

export class MockAgentGateway implements AgentGatewayPort {
  async decideNextAction(
    context: AgentTurnContext,
    callbacks?: AgentMessageStreamCallbacks,
  ): Promise<AgentToolCallParams> {
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
    const receivedPrivateFundingPrompt = context.recentMessages.some(
      (message) =>
        message.visibility === 'private' &&
        message.senderAgentId === banker?.agentId &&
        message.recipientAgentId === context.self.agentId,
    );

    if (context.self.role === 'banker' && trader && context.turnNumber === 1) {
      const action = {
        name: 'messaging.send_private',
        arguments: {
          recipientAgentId: trader.agentId,
          content: 'Share your strongest signal and I can review terms.',
        },
      } satisfies AgentToolCallParams;

      streamMessageAction(action, callbacks);
      return action;
    }

    if (
      context.self.role === 'trader' &&
      scenario === 'market_opportunity' &&
      riskyOpportunity &&
      context.marketContext.selfOpenPositions.length === 0 &&
      context.turnNumber === 1
    ) {
      return {
        name: 'market.open_position',
        arguments: {
          opportunityId: riskyOpportunity.opportunityId,
          amount: riskyOpportunity.minCommitment,
        },
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
        name: 'transfer.request_payment',
        arguments: {
          recipientAgentId: trader.agentId,
          amount: '12.5000',
          rationale:
            'Settle the analysis fee before I disclose the full signal.',
        },
      };
    }

    if (
      context.self.role === 'trader' &&
      banker &&
      context.turnNumber === 2 &&
      receivedPrivateFundingPrompt &&
      !ownCustodyPosition
    ) {
      return {
        name: 'treasury.place_with_banker',
        arguments: {
          recipientAgentId: banker.agentId,
          amount: '10.0000',
        },
      };
    }

    if (
      context.self.role === 'trader' &&
      context.turnNumber >= 3 &&
      pendingProposal
    ) {
      if (scenario === 'reject_proposal') {
        return {
          name: 'transfer.reject_payment_request',
          arguments: {
            proposalActionId: pendingProposal.actionId,
            rationale: 'The proposed transfer is too risky for this round.',
          },
        };
      }

      if (scenario === 'counter_proposal') {
        return {
          name: 'transfer.counter_payment_request',
          arguments: {
            proposalActionId: pendingProposal.actionId,
            recipientAgentId: analyst?.agentId ?? pendingProposal.agentId,
            amount: '8.5000',
            rationale: 'I will settle, but only at a reduced fee.',
          },
        };
      }

      return {
        name: 'transfer.accept_payment_request',
        arguments: {
          proposalActionId: pendingProposal.actionId,
        },
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
        name: 'treasury.redeem_from_banker',
        arguments: {
          recipientAgentId: banker.agentId,
          amount:
            ownCustodyPosition.accruedInterest !== '0.0000'
              ? ownCustodyPosition.accruedInterest
              : '2.5000',
        },
      };
    }

    if (
      context.self.role === 'analyst' &&
      scenario === 'counter_proposal' &&
      context.turnNumber >= 4 &&
      pendingProposal?.type === 'counter_payment_request'
    ) {
      return {
        name: 'transfer.accept_payment_request',
        arguments: {
          proposalActionId: pendingProposal.actionId,
        },
      };
    }

    if (context.self.role === 'analyst' && context.turnNumber === 2) {
      const action = {
        name: 'messaging.send_public',
        arguments: {
          content: 'Volatility is compressing and timing risk is falling.',
        },
      } satisfies AgentToolCallParams;

      streamMessageAction(action, callbacks);
      return action;
    }

    return {
      name: 'turn.finalize',
      arguments: {},
    };
  }
}

function streamMessageAction(
  action: AgentToolCallParams,
  callbacks?: AgentMessageStreamCallbacks,
) {
  if (
    !callbacks ||
    (action.name !== 'messaging.send_private' &&
      action.name !== 'messaging.send_public')
  ) {
    return;
  }

  const streamId = `mock-stream-${Math.random().toString(36).slice(2, 10)}`;
  const visibility =
    action.name === 'messaging.send_private' ? 'private' : 'public';
  const recipientAgentId =
    action.name === 'messaging.send_private'
      ? action.arguments.recipientAgentId
      : null;
  const fullContent = action.arguments.content;

  callbacks.onMessageStreamStarted({
    streamId,
    visibility,
    recipientAgentId,
  });

  const midpoint = Math.max(1, Math.ceil(fullContent.length / 2));
  const chunks = [
    fullContent.slice(0, midpoint),
    fullContent.slice(midpoint),
  ].filter((chunk) => chunk.length > 0);
  let streamedContent = '';

  for (const chunk of chunks) {
    streamedContent += chunk;
    callbacks.onMessageStreamDelta({
      streamId,
      visibility,
      recipientAgentId,
      delta: chunk,
      content: streamedContent,
    });
  }

  callbacks.onMessageStreamCompleted({
    streamId,
    visibility,
    recipientAgentId,
    content: streamedContent,
  });
}
