import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';

import type { AgentGatewayPort } from '../../application/ports/agent-gateway.port.js';

export class MockAgentGateway implements AgentGatewayPort {
  async decideNextAction(context: AgentTurnContext): Promise<AgentAction> {
    const scenario = process.env.AGENT_MOCK_SCENARIO;
    const banker = context.peers.find((peer) => peer.role === 'banker');
    const trader = context.peers.find((peer) => peer.role === 'trader');
    const ownCustodyPosition = context.treasuryContext.selfCustodyPosition;
    const pendingProposal = context.recentActions.find((action) => {
      if (
        (action.type !== 'propose_direct_transfer' &&
          action.type !== 'counter_direct_transfer_proposal') ||
        action.recipientAgentId !== context.self.agentId
      ) {
        return false;
      }

      return !context.recentActions.some(
        (candidate) =>
          (candidate.type === 'counter_direct_transfer_proposal' ||
            candidate.type === 'accept_direct_transfer_proposal' ||
            candidate.type === 'reject_direct_transfer_proposal') &&
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
      return {
        type: 'send_private_message',
        recipientAgentId: trader.agentId,
        content: 'Share your strongest signal and I can review terms.',
      };
    }

    if (
      scenario === 'custody_cycle' &&
      context.self.role === 'trader' &&
      banker &&
      context.turnNumber === 2 &&
      receivedPrivateFundingPrompt &&
      !ownCustodyPosition
    ) {
      return {
        type: 'place_funds_with_banker',
        recipientAgentId: banker.agentId,
        amount: '10.0000',
      };
    }

    if (
      scenario === 'custody_cycle' &&
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
      context.self.role === 'trader' &&
      banker &&
      context.turnNumber === 2 &&
      receivedPrivateFundingPrompt &&
      !pendingProposal
    ) {
      return {
        type: 'propose_direct_transfer',
        recipientAgentId: banker.agentId,
        amount: '12.5000',
        rationale: 'I need short-term capital to press a momentum setup.',
      };
    }

    if (
      context.self.role === 'banker' &&
      context.turnNumber >= 3 &&
      pendingProposal
    ) {
      if (scenario === 'reject_proposal') {
        return {
          type: 'reject_direct_transfer_proposal',
          proposalActionId: pendingProposal.actionId,
          rationale: 'The proposed transfer is too risky for this round.',
        };
      }

      if (scenario === 'counter_proposal') {
        return {
          type: 'counter_direct_transfer_proposal',
          proposalActionId: pendingProposal.actionId,
          recipientAgentId: pendingProposal.agentId,
          amount: '8.5000',
          rationale: 'I can fund this round, but only at a lower amount.',
        };
      }

      return {
        type: 'accept_direct_transfer_proposal',
        proposalActionId: pendingProposal.actionId,
      };
    }

    if (
      context.self.role === 'trader' &&
      scenario === 'counter_proposal' &&
      context.turnNumber >= 4 &&
      pendingProposal?.type === 'counter_direct_transfer_proposal'
    ) {
      return {
        type: 'accept_direct_transfer_proposal',
        proposalActionId: pendingProposal.actionId,
      };
    }

    if (context.self.role === 'analyst' && context.turnNumber === 2) {
      return {
        type: 'send_public_message',
        content: 'Volatility is compressing and timing risk is falling.',
      };
    }

    return {
      type: 'finalize_turn',
    };
  }
}
