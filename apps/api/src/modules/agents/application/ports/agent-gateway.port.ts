import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';
import type { AgentMessageVisibility } from '@llm-sim/shared-types';

export interface AgentMessageStreamCallbacks {
  onMessageStreamStarted(input: {
    streamId: string;
    visibility: AgentMessageVisibility;
    recipientAgentId: string | null;
  }): void;
  onMessageStreamDelta(input: {
    streamId: string;
    visibility: AgentMessageVisibility;
    recipientAgentId: string | null;
    delta: string;
    content: string;
  }): void;
  onMessageStreamCompleted(input: {
    streamId: string;
    visibility: AgentMessageVisibility;
    recipientAgentId: string | null;
    content: string;
  }): void;
  onMessageStreamAborted(input: {
    streamId: string;
    visibility: AgentMessageVisibility;
    recipientAgentId: string | null;
    content?: string;
  }): void;
}

export interface AgentGatewayPort {
  decideNextAction(
    context: AgentTurnContext,
    callbacks?: AgentMessageStreamCallbacks,
  ): Promise<AgentAction>;
}
