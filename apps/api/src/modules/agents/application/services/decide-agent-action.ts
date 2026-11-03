import { AgentProviderError } from '../ports/agent-provider.error.js';
import {
  agentActionSchema,
  type AgentAction,
  type AgentTurnContext,
} from '@llm-sim/mcp-contracts';
import type {
  AgentGatewayPort,
  AgentMessageStreamCallbacks,
} from '../ports/agent-gateway.port.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';

/** Validate before execution; retry invalid model output with its actual validation error. */
export async function decideAgentAction(
  gateway: AgentGatewayPort,
  context: AgentTurnContext,
  callbacks: AgentMessageStreamCallbacks,
): Promise<AgentAction> {
  let validationFeedback = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const requestContext =
        attempt === 0
          ? context
          : {
              ...context,
              depositPolicy: `${context.depositPolicy ?? ''} Your previous decision was rejected: ${validationFeedback}. Correct those fields. For private messages provide recipientAgentId from peers and non-empty content. Include decisionExplanation (1–800 characters) describing the intended action and relevant personality trade-offs.`,
            };
      const action = agentActionSchema.parse(
        await gateway.decideNextAction(
          requestContext,
          ...(context.self.role === 'trader' ? [] : [callbacks]),
        ),
      );
      if (context.self.role === 'trader' && !action.decisionExplanation?.trim())
        throw new DomainInvariantError(
          'The trader decision is missing its decisionExplanation (Thought).',
        );
      return action;
    } catch (error) {
      if (error instanceof AgentProviderError) throw error;
      validationFeedback =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Invalid decision format';
      if (attempt === 1)
        throw new DomainInvariantError(
          `${context.self.name}: decision failed after retry. ${validationFeedback}`,
        );
    }
  }
  throw new DomainInvariantError('No valid decision was returned.');
}
