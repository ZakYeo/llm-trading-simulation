import { randomUUID } from 'node:crypto';

import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';
import { agentActionSchema } from '@llm-sim/mcp-contracts';
import type OpenAI from 'openai';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type {
  AgentGatewayPort,
  AgentMessageStreamCallbacks,
} from '../../application/ports/agent-gateway.port.js';
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
      'opportunityId',
      'reasoning',
    ],
    properties: {
      type: {
        type: 'string',
        enum: [
          'send_public_message',
          'send_private_message',
          'request_payment',
          'counter_payment_request',
          'accept_payment_request',
          'reject_payment_request',
          'place_funds_with_banker',
          'redeem_funds_from_banker',
          'open_market_position',
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
      opportunityId: {
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
  opportunityId: string | null;
  reasoning: string | null;
}

interface MessageStreamPreview {
  type: 'send_public_message' | 'send_private_message';
  recipientAgentId: string | null;
  content: string;
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

function stripOpportunitySessionPrefix(opportunityId: string): string {
  return opportunityId.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/iu,
    '',
  );
}

function resolveOpportunityId(
  rawOpportunityId: string | null,
  context: AgentTurnContext,
): string | null {
  if (!rawOpportunityId) {
    return null;
  }

  const visibleOpportunities = context.marketContext.visibleOpportunities;
  const exactIdMatch = visibleOpportunities.find(
    (opportunity) => opportunity.opportunityId === rawOpportunityId,
  );

  if (exactIdMatch) {
    return exactIdMatch.opportunityId;
  }

  const exactTitleMatch = visibleOpportunities.find(
    (opportunity) => opportunity.title === rawOpportunityId,
  );

  if (exactTitleMatch) {
    return exactTitleMatch.opportunityId;
  }

  const normalizedRawOpportunityId =
    stripOpportunitySessionPrefix(rawOpportunityId);
  const suffixMatches = visibleOpportunities.filter(
    (opportunity) =>
      stripOpportunitySessionPrefix(opportunity.opportunityId) ===
      normalizedRawOpportunityId,
  );

  if (suffixMatches.length === 1) {
    return suffixMatches[0]?.opportunityId ?? null;
  }

  return rawOpportunityId;
}

function normalizeOpenMarketPositionAmount(
  rawAmount: string | null,
  opportunityId: string,
  context: AgentTurnContext,
): string | null {
  if (!rawAmount) {
    return null;
  }

  let amount: Money;

  try {
    amount = Money.fromDecimal(rawAmount);
  } catch {
    return rawAmount;
  }

  const opportunity = context.marketContext.visibleOpportunities.find(
    (candidate) => candidate.opportunityId === opportunityId,
  );

  if (!opportunity) {
    return rawAmount;
  }

  const minimumCommitment = Money.fromDecimal(opportunity.minCommitment);
  const maximumCommitment = Money.fromDecimal(opportunity.maxCommitment);
  const availableBalance = Money.fromDecimal(context.self.availableBalance);
  let normalizedAmount = amount;

  if (!normalizedAmount.greaterThanOrEqual(minimumCommitment)) {
    normalizedAmount = minimumCommitment;
  }

  if (!maximumCommitment.greaterThanOrEqual(normalizedAmount)) {
    normalizedAmount = maximumCommitment;
  }

  if (!availableBalance.greaterThanOrEqual(normalizedAmount)) {
    normalizedAmount = availableBalance;
  }

  if (!normalizedAmount.greaterThan(Money.zero())) {
    return rawAmount;
  }

  return normalizedAmount.toDecimal();
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
  const opportunityId = resolveOpportunityId(
    rawDecision.opportunityId,
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
    case 'request_payment':
      if (!recipientAgentId || !rawDecision.amount || !rawDecision.rationale) {
        throw new DomainInvariantError(
          'request_payment requires recipientAgentId, amount, and rationale from the model.',
        );
      }

      return {
        type: rawDecision.type,
        recipientAgentId,
        amount: rawDecision.amount,
        rationale: rawDecision.rationale,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'counter_payment_request':
      if (
        !rawDecision.proposalActionId ||
        !recipientAgentId ||
        !rawDecision.amount ||
        !rawDecision.rationale
      ) {
        throw new DomainInvariantError(
          'counter_payment_request requires proposalActionId, recipientAgentId, amount, and rationale from the model.',
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
    case 'accept_payment_request':
      if (!rawDecision.proposalActionId) {
        throw new DomainInvariantError(
          'accept_payment_request requires proposalActionId from the model.',
        );
      }

      return {
        type: rawDecision.type,
        proposalActionId: rawDecision.proposalActionId,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'reject_payment_request':
      if (!rawDecision.proposalActionId || !rawDecision.rationale) {
        throw new DomainInvariantError(
          'reject_payment_request requires proposalActionId and rationale from the model.',
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
    case 'open_market_position':
      if (!opportunityId || !rawDecision.amount) {
        throw new DomainInvariantError(
          'open_market_position requires opportunityId and amount from the model.',
        );
      }

      {
        const amount = normalizeOpenMarketPositionAmount(
          rawDecision.amount,
          opportunityId,
          context,
        );

        if (!amount) {
          throw new DomainInvariantError(
            'open_market_position requires amount from the model.',
          );
        }

        return {
          type: rawDecision.type,
          opportunityId,
          amount,
          reasoning: rawDecision.reasoning ?? undefined,
        };
      }
    case 'finalize_turn':
      return {
        type: rawDecision.type,
        reasoning: rawDecision.reasoning ?? undefined,
      };
  }
}

function buildDecisionRequest(
  model: string,
  prompt: string,
  context: AgentTurnContext,
) {
  return {
    model,
    input: [
      {
        role: 'system' as const,
        content: prompt,
      },
      {
        role: 'user' as const,
        content: JSON.stringify(context),
      },
    ],
    text: {
      format: {
        type: 'json_schema' as const,
        ...agentDecisionJsonSchema,
      },
    },
  };
}

function decodeJsonFragment(value: string) {
  return value
    .replace(/\\\\/gu, '\\')
    .replace(/\\"/gu, '"')
    .replace(/\\n/gu, '\n')
    .replace(/\\r/gu, '\r')
    .replace(/\\t/gu, '\t')
    .replace(/\\\//gu, '/');
}

function extractPartialMessageStream(
  rawText: string,
): MessageStreamPreview | null {
  const typeMatch = rawText.match(
    /"type"\s*:\s*"(send_public_message|send_private_message)"/u,
  );

  if (!typeMatch) {
    return null;
  }

  const contentMatch = rawText.match(/"content"\s*:\s*"((?:\\.|[^"])*)/u);

  if (!contentMatch) {
    return null;
  }

  const recipientMatch = rawText.match(
    /"recipientAgentId"\s*:\s*(null|"([^"]*)")/u,
  );

  return {
    type: typeMatch[1] as MessageStreamPreview['type'],
    recipientAgentId:
      recipientMatch?.[1] === 'null' ? null : (recipientMatch?.[2] ?? null),
    content: decodeJsonFragment(contentMatch[1] ?? ''),
  };
}

function logParsedAction(context: AgentTurnContext, parsedAction: AgentAction) {
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
      opportunityId:
        'opportunityId' in parsedAction ? parsedAction.opportunityId : null,
      reasoning: parsedAction.reasoning ?? null,
    }),
  );
}

function toFinalizedAction(outputText: string, context: AgentTurnContext) {
  return agentActionSchema.parse(
    normalizeAgentDecision(JSON.parse(outputText) as RawAgentDecision, context),
  );
}

function emitMessagePreview(
  rawText: string,
  callbacks: AgentMessageStreamCallbacks | undefined,
  streamState: {
    active?: {
      streamId: string;
      visibility: 'public' | 'private';
      recipientAgentId: string | null;
      content: string;
    };
  },
) {
  if (!callbacks) {
    return;
  }

  const preview = extractPartialMessageStream(rawText);

  if (!preview) {
    return;
  }

  const visibility =
    preview.type === 'send_private_message' ? 'private' : 'public';
  const recipientAgentId =
    preview.type === 'send_private_message' ? preview.recipientAgentId : null;

  if (!streamState.active) {
    streamState.active = {
      streamId: randomUUID(),
      visibility,
      recipientAgentId,
      content: '',
    };
    callbacks.onMessageStreamStarted({
      streamId: streamState.active.streamId,
      visibility,
      recipientAgentId,
    });
  }

  const nextContent = preview.content;
  const previousContent = streamState.active.content;

  if (
    streamState.active.visibility !== visibility ||
    streamState.active.recipientAgentId !== recipientAgentId
  ) {
    streamState.active.visibility = visibility;
    streamState.active.recipientAgentId = recipientAgentId;
  }

  if (nextContent.length <= previousContent.length) {
    return;
  }

  const delta = nextContent.slice(previousContent.length);
  streamState.active.content = nextContent;
  callbacks.onMessageStreamDelta({
    streamId: streamState.active.streamId,
    visibility,
    recipientAgentId,
    delta,
    content: nextContent,
  });
}

async function consumeStreamingResponse(
  stream: AsyncIterable<unknown>,
  callbacks: AgentMessageStreamCallbacks | undefined,
) {
  const streamState: {
    active?: {
      streamId: string;
      visibility: 'public' | 'private';
      recipientAgentId: string | null;
      content: string;
    };
  } = {};
  let outputText = '';

  for await (const event of stream) {
    const typedEvent = event as {
      type?: string;
      delta?: string;
      text?: string;
      snapshot?: string;
      response?: { output_text?: string };
    };

    if (
      typedEvent.type === 'response.output_text.delta' &&
      typeof typedEvent.delta === 'string'
    ) {
      outputText += typedEvent.delta;
      emitMessagePreview(outputText, callbacks, streamState);
      continue;
    }

    if (
      typedEvent.type === 'response.output_text.done' &&
      typeof typedEvent.text === 'string'
    ) {
      outputText = typedEvent.text;
      emitMessagePreview(outputText, callbacks, streamState);
      continue;
    }

    if (typeof typedEvent.snapshot === 'string') {
      outputText = typedEvent.snapshot;
      emitMessagePreview(outputText, callbacks, streamState);
      continue;
    }

    if (typeof typedEvent.response?.output_text === 'string') {
      outputText = typedEvent.response.output_text;
      emitMessagePreview(outputText, callbacks, streamState);
    }
  }

  return {
    outputText,
    streamState,
  };
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
      .addPersonalityProfileSummary()
      .addTreasuryContextSummary()
      .addMarketContextSummary()
      .addActionSemanticsSummary()
      .addActionableProposalSummary()
      .addNegotiationStateSummary()
      .addRoleDirective()
      .addTurnSignal()
      .build();
  }

  async decideNextAction(
    context: AgentTurnContext,
    callbacks?: AgentMessageStreamCallbacks,
  ): Promise<AgentAction> {
    const prompt = this.buildPrompt(context);
    const request = buildDecisionRequest(this.model, prompt, context);
    let activeStream:
      | {
          streamId: string;
          visibility: 'public' | 'private';
          recipientAgentId: string | null;
          content: string;
        }
      | undefined;

    try {
      const responses = this.client.responses as OpenAI['responses'] & {
        stream?: (input: unknown) => Promise<
          AsyncIterable<unknown> & {
            finalResponse?: () => Promise<{ output_text?: string }>;
          }
        >;
      };
      let outputText = '';
      if (typeof responses.stream === 'function') {
        const responseStream = await responses.stream(request);
        const consumed = await consumeStreamingResponse(
          responseStream,
          callbacks,
        );
        outputText = consumed.outputText;
        activeStream = consumed.streamState.active;

        if (!outputText && typeof responseStream.finalResponse === 'function') {
          outputText =
            (await responseStream.finalResponse())?.output_text ?? '';
        }
      } else {
        const response = await this.client.responses.create(request);
        outputText = response.output_text ?? '';
      }

      if (!outputText) {
        throw new DomainInvariantError(
          'OpenAI agent gateway returned no structured action.',
        );
      }

      const parsedAction = toFinalizedAction(outputText, context);

      if (
        callbacks &&
        (parsedAction.type === 'send_private_message' ||
          parsedAction.type === 'send_public_message')
      ) {
        const visibility =
          parsedAction.type === 'send_private_message' ? 'private' : 'public';
        const recipientAgentId =
          parsedAction.type === 'send_private_message'
            ? parsedAction.recipientAgentId
            : null;
        const streamId = activeStream?.streamId ?? randomUUID();

        if (!activeStream) {
          callbacks.onMessageStreamStarted({
            streamId,
            visibility,
            recipientAgentId,
          });
        }

        if ((activeStream?.content ?? '') !== parsedAction.content) {
          callbacks.onMessageStreamDelta({
            streamId,
            visibility,
            recipientAgentId,
            delta: parsedAction.content.slice(
              activeStream?.content.length ?? 0,
            ),
            content: parsedAction.content,
          });
        }

        callbacks.onMessageStreamCompleted({
          streamId,
          visibility,
          recipientAgentId,
          content: parsedAction.content,
        });
      } else if (callbacks && activeStream) {
        callbacks.onMessageStreamAborted({
          streamId: activeStream.streamId,
          visibility: activeStream.visibility,
          recipientAgentId: activeStream.recipientAgentId,
          content: activeStream.content,
        });
      }

      logParsedAction(context, parsedAction);

      return parsedAction;
    } catch (error) {
      if (callbacks && activeStream) {
        callbacks.onMessageStreamAborted({
          streamId: activeStream.streamId,
          visibility: activeStream.visibility,
          recipientAgentId: activeStream.recipientAgentId,
          content: activeStream.content,
        });
      }

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
