import {
  agentActionSchema,
  parseAgentToolCallParams,
  type AgentAction,
} from '@llm-sim/mcp-contracts';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { AgentGatewayDecision } from '../ports/agent-gateway.port.js';

export class AgentGatewayDecisionNormalizer {
  normalize(decision: AgentGatewayDecision): AgentAction {
    const legacyAction = agentActionSchema.safeParse(decision);

    if (legacyAction.success) {
      return legacyAction.data;
    }

    const toolCall = parseAgentToolCallParams(decision);

    switch (toolCall.name) {
      case 'messaging.send_public':
        return {
          type: 'send_public_message',
          content: toolCall.arguments.content,
        };
      case 'messaging.send_private':
        return {
          type: 'send_private_message',
          recipientAgentId: toolCall.arguments.recipientAgentId,
          content: toolCall.arguments.content,
        };
      case 'transfer.request_payment':
        return {
          type: 'request_payment',
          recipientAgentId: toolCall.arguments.recipientAgentId,
          amount: toolCall.arguments.amount,
          rationale: toolCall.arguments.rationale,
        };
      case 'transfer.counter_payment_request':
        return {
          type: 'counter_payment_request',
          proposalActionId: toolCall.arguments.proposalActionId,
          recipientAgentId: toolCall.arguments.recipientAgentId,
          amount: toolCall.arguments.amount,
          rationale: toolCall.arguments.rationale,
        };
      case 'transfer.accept_payment_request':
        return {
          type: 'accept_payment_request',
          proposalActionId: toolCall.arguments.proposalActionId,
        };
      case 'transfer.reject_payment_request':
        return {
          type: 'reject_payment_request',
          proposalActionId: toolCall.arguments.proposalActionId,
          rationale: toolCall.arguments.rationale,
        };
      case 'treasury.place_with_banker':
        return {
          type: 'place_funds_with_banker',
          recipientAgentId: toolCall.arguments.recipientAgentId,
          amount: toolCall.arguments.amount,
        };
      case 'treasury.redeem_from_banker':
        return {
          type: 'redeem_funds_from_banker',
          recipientAgentId: toolCall.arguments.recipientAgentId,
          amount: toolCall.arguments.amount,
        };
      case 'market.open_position':
        return {
          type: 'open_market_position',
          opportunityId: toolCall.arguments.opportunityId,
          amount: toolCall.arguments.amount,
        };
      case 'turn.finalize':
        return {
          type: 'finalize_turn',
        };
      default:
        throw new DomainInvariantError('Unsupported agent tool call.');
    }
  }
}
