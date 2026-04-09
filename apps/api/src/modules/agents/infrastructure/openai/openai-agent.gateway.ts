import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';
import { agentActionSchema } from '@llm-sim/mcp-contracts';
import type OpenAI from 'openai';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { AgentGatewayPort } from '../../application/ports/agent-gateway.port.js';
import {
  defaultOpenAiAgentSystemPrompt,
  OpenAiAgentSystemContextBuilder,
} from './openai-agent-system-context.builder.js';
const agentDecisionJsonSchema = {
  name: 'agent_decision',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'type',
      'recipientAgentId',
      'content',
      'amount',
      'rationale',
      'proposalActionId',
      'reasoning',
    ],
    properties: {
      type: {
        type: 'string',
        enum: [
          'send_public_message',
          'send_private_message',
          'propose_direct_transfer',
          'counter_direct_transfer_proposal',
          'accept_direct_transfer_proposal',
          'reject_direct_transfer_proposal',
          'place_funds_with_banker',
          'redeem_funds_from_banker',
          'finalize_turn',
        ],
      },
      recipientAgentId: {
        type: ['string', 'null'],
      },
      content: {
        type: ['string', 'null'],
      },
      amount: {
        type: ['string', 'null'],
      },
      rationale: {
        type: ['string', 'null'],
      },
      proposalActionId: {
        type: ['string', 'null'],
      },
      reasoning: {
        type: ['string', 'null'],
      },
    },
  },
} as const;

interface RawAgentDecision {
  type: AgentAction['type'];
  recipientAgentId: string | null;
  content: string | null;
  amount: string | null;
  rationale: string | null;
  proposalActionId: string | null;
  reasoning: string | null;
}

function resolveRecipientAgentId(
  rawRecipientAgentId: string | null,
  rawDecisionType: AgentAction['type'],
  context: AgentTurnContext,
): string | null {
  if (!rawRecipientAgentId) {
    return null;
  }

  if (context.peers.some((peer) => peer.agentId === rawRecipientAgentId)) {
    return rawRecipientAgentId;
  }

  const namedPeer = context.peers.find(
    (peer) => peer.name === rawRecipientAgentId,
  );

  if (namedPeer) {
    return namedPeer.agentId;
  }

  const banker = context.peers.find((peer) => peer.role === 'banker');
  const trader = context.peers.find((peer) => peer.role === 'trader');
  const primaryCounterpartyAgentId =
    context.negotiationState.primaryCounterpartyAgentId;

  if (
    context.self.role === 'banker' &&
    trader &&
    (rawDecisionType === 'send_private_message' ||
      rawDecisionType === 'place_funds_with_banker' ||
      rawDecisionType === 'redeem_funds_from_banker')
  ) {
    return trader.agentId;
  }

  if (
    context.self.role === 'trader' &&
    banker &&
    (rawDecisionType === 'send_private_message' ||
      rawDecisionType === 'place_funds_with_banker' ||
      rawDecisionType === 'redeem_funds_from_banker')
  ) {
    return banker.agentId;
  }

  if (primaryCounterpartyAgentId) {
    return primaryCounterpartyAgentId;
  }

  return rawRecipientAgentId;
}

function normalizeAgentDecision(
  rawDecision: RawAgentDecision,
  context: AgentTurnContext,
): AgentAction {
  const recipientAgentId = resolveRecipientAgentId(
    rawDecision.recipientAgentId,
    rawDecision.type,
    context,
  );

  switch (rawDecision.type) {
    case 'send_public_message':
      if (!rawDecision.content) {
        throw new DomainInvariantError(
          'send_public_message requires content from the model.',
        );
      }

      return {
        type: rawDecision.type,
        content: rawDecision.content,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'send_private_message':
      if (!recipientAgentId || !rawDecision.content) {
        throw new DomainInvariantError(
          'send_private_message requires recipientAgentId and content from the model.',
        );
      }

      return {
        type: rawDecision.type,
        recipientAgentId,
        content: rawDecision.content,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'propose_direct_transfer':
      if (!recipientAgentId || !rawDecision.amount || !rawDecision.rationale) {
        throw new DomainInvariantError(
          'propose_direct_transfer requires recipientAgentId, amount, and rationale from the model.',
        );
      }

      return {
        type: rawDecision.type,
        recipientAgentId,
        amount: rawDecision.amount,
        rationale: rawDecision.rationale,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'counter_direct_transfer_proposal':
      if (
        !rawDecision.proposalActionId ||
        !recipientAgentId ||
        !rawDecision.amount ||
        !rawDecision.rationale
      ) {
        throw new DomainInvariantError(
          'counter_direct_transfer_proposal requires proposalActionId, recipientAgentId, amount, and rationale from the model.',
        );
      }

      return {
        type: rawDecision.type,
        proposalActionId: rawDecision.proposalActionId,
        recipientAgentId,
        amount: rawDecision.amount,
        rationale: rawDecision.rationale,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'accept_direct_transfer_proposal':
      if (!rawDecision.proposalActionId) {
        throw new DomainInvariantError(
          'accept_direct_transfer_proposal requires proposalActionId from the model.',
        );
      }

      return {
        type: rawDecision.type,
        proposalActionId: rawDecision.proposalActionId,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'reject_direct_transfer_proposal':
      if (!rawDecision.proposalActionId || !rawDecision.rationale) {
        throw new DomainInvariantError(
          'reject_direct_transfer_proposal requires proposalActionId and rationale from the model.',
        );
      }

      return {
        type: rawDecision.type,
        proposalActionId: rawDecision.proposalActionId,
        rationale: rawDecision.rationale,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'place_funds_with_banker':
      if (!recipientAgentId || !rawDecision.amount) {
        throw new DomainInvariantError(
          'place_funds_with_banker requires recipientAgentId and amount from the model.',
        );
      }

      return {
        type: rawDecision.type,
        recipientAgentId,
        amount: rawDecision.amount,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'redeem_funds_from_banker':
      if (!recipientAgentId || !rawDecision.amount) {
        throw new DomainInvariantError(
          'redeem_funds_from_banker requires recipientAgentId and amount from the model.',
        );
      }

      return {
        type: rawDecision.type,
        recipientAgentId,
        amount: rawDecision.amount,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'finalize_turn':
      return {
        type: rawDecision.type,
        reasoning: rawDecision.reasoning ?? undefined,
      };
  }
}

export class OpenAiAgentGateway implements AgentGatewayPort {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
    private readonly systemPrompt: string = defaultOpenAiAgentSystemPrompt,
    private readonly strictMode = false,
  ) {}

  private buildPrompt(context: AgentTurnContext): string {
    return new OpenAiAgentSystemContextBuilder(context, this.systemPrompt)
      .addBaseSystemPrompt()
      .addPeerSummary()
      .addEconomicContextSummary()
      .addTreasuryContextSummary()
      .addActionSemanticsSummary()
      .addActionableProposalSummary()
      .addNegotiationStateSummary()
      .addRoleDirective()
      .addTurnSignal()
      .build();
  }

  async decideNextAction(context: AgentTurnContext): Promise<AgentAction> {
    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: [
          {
            role: 'system',
            content: this.buildPrompt(context),
          },
          {
            role: 'user',
            content: JSON.stringify(context),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            ...agentDecisionJsonSchema,
          },
        },
      });

      if (!response.output_text) {
        throw new DomainInvariantError(
          'OpenAI agent gateway returned no structured action.',
        );
      }

      const parsedAction = agentActionSchema.parse(
        normalizeAgentDecision(
          JSON.parse(response.output_text) as RawAgentDecision,
          context,
        ),
      );

      console.info(
        JSON.stringify({
          type: 'agent_decision',
          gameSessionId: context.gameId,
          turnNumber: context.turnNumber,
          agentId: context.self.agentId,
          agentName: context.self.name,
          role: context.self.role,
          actionType: parsedAction.type,
          recipientAgentId:
            'recipientAgentId' in parsedAction
              ? parsedAction.recipientAgentId
              : null,
          proposalActionId:
            'proposalActionId' in parsedAction
              ? parsedAction.proposalActionId
              : null,
          reasoning: parsedAction.reasoning ?? null,
        }),
      );

      return parsedAction;
    } catch (error) {
      console.error(
        JSON.stringify({
          type: 'agent_decision_error',
          gameSessionId: context.gameId,
          turnNumber: context.turnNumber,
          agentId: context.self.agentId,
          agentName: context.self.name,
          role: context.self.role,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      if (this.strictMode) {
        throw error;
      }

      return {
        type: 'finalize_turn',
      };
    }
  }
}
