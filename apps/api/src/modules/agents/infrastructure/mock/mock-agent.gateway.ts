import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';

import type { AgentGatewayPort } from '../../application/ports/agent-gateway.port.js';

export class MockAgentGateway implements AgentGatewayPort {
  async decideNextAction(context: AgentTurnContext): Promise<AgentAction> {
    const banker = context.peers.find((peer) => peer.role === 'banker');
    const trader = context.peers.find((peer) => peer.role === 'trader');

    if (context.self.role === 'trader' && banker) {
      return {
        type: 'send_private_message',
        recipientAgentId: banker.agentId,
        content: 'I can trade momentum for short-term funding this round.',
      };
    }

    if (context.self.role === 'banker' && trader) {
      return {
        type: 'send_private_message',
        recipientAgentId: trader.agentId,
        content: 'Share your strongest signal and I can review terms.',
      };
    }

    return {
      type: 'finalize_turn',
    };
  }
}
