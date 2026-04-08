import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';

import type { AgentGatewayPort } from '../../application/ports/agent-gateway.port.js';

export class MockAgentGateway implements AgentGatewayPort {
  async decideNextAction(context: AgentTurnContext): Promise<AgentAction> {
    const banker = context.peers.find((peer) => peer.role === 'banker');
    const trader = context.peers.find((peer) => peer.role === 'trader');
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
      context.self.role === 'trader' &&
      banker &&
      receivedPrivateFundingPrompt
    ) {
      return {
        type: 'propose_direct_transfer',
        recipientAgentId: banker.agentId,
        amount: '12.5000',
        rationale: 'I need short-term capital to press a momentum setup.',
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
