import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';

export interface AgentGatewayPort {
  decideNextAction(context: AgentTurnContext): Promise<AgentAction>;
}
