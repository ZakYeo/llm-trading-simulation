import { randomUUID } from 'node:crypto';

import type {
  AgentToolCallParams,
  AgentToolName,
  AgentTurnContext,
} from '@llm-sim/mcp-contracts';
import {
  agentToolDefinitions,
  parseAgentToolCallParams,
} from '@llm-sim/mcp-contracts';
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
  name: 'agent_tool_call',
  strict: true,
  schema: {
    anyOf: agentToolDefinitions.map((tool) => ({
      type: 'object',
      additionalProperties: false,
      required: ['name', 'arguments'],
      properties: {
        name: {
          type: 'string',
          const: tool.name,
        },
        arguments: tool.inputSchema,
      },
    })),
  },
} as const;

interface RawAgentToolCall {
  name: AgentToolName;
  arguments?: Record<string, unknown>;
}

interface MessageStreamPreview {
  name: 'messaging.send_public' | 'messaging.send_private';
  recipientAgentId: string | null;
  content: string;
}

function resolveRecipientAgentId(
  rawRecipientAgentId: string | null,
  rawToolName:
    | 'messaging.send_private'
    | 'treasury.place_with_banker'
    | 'treasury.redeem_from_banker',
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
    (rawToolName === 'messaging.send_private' ||
      rawToolName === 'treasury.place_with_banker' ||
      rawToolName === 'treasury.redeem_from_banker')
  ) {
    return trader.agentId;
  }

  if (
    context.self.role === 'trader' &&
    banker &&
    (rawToolName === 'messaging.send_private' ||
      rawToolName === 'treasury.place_with_banker' ||
      rawToolName === 'treasury.redeem_from_banker')
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
  rawAmount: string | undefined,
  opportunityId: string,
  context: AgentTurnContext,
): string | undefined {
  if (!rawAmount) {
    return undefined;
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
  rawToolCall: RawAgentToolCall,
  context: AgentTurnContext,
): AgentToolCallParams {
  switch (rawToolCall.name) {
    case 'messaging.send_public': {
      const content =
        typeof rawToolCall.arguments?.content === 'string'
          ? rawToolCall.arguments.content
          : undefined;

      if (!content) {
        throw new DomainInvariantError(
          'messaging.send_public requires content from the model.',
        );
      }

      return {
        name: rawToolCall.name,
        arguments: {
          content,
        },
      };
    }
    case 'messaging.send_private': {
      const rawRecipientAgentId =
        typeof rawToolCall.arguments?.recipientAgentId === 'string'
          ? rawToolCall.arguments.recipientAgentId
          : null;
      const content =
        typeof rawToolCall.arguments?.content === 'string'
          ? rawToolCall.arguments.content
          : undefined;
      const recipientAgentId = resolveRecipientAgentId(
        rawRecipientAgentId,
        rawToolCall.name,
        context,
      );

      if (!recipientAgentId || !content) {
        throw new DomainInvariantError(
          'messaging.send_private requires recipientAgentId and content from the model.',
        );
      }

      return {
        name: rawToolCall.name,
        arguments: {
          recipientAgentId,
          content,
        },
      };
    }
    case 'transfer.request_payment': {
      const rawRecipientAgentId =
        typeof rawToolCall.arguments?.recipientAgentId === 'string'
          ? rawToolCall.arguments.recipientAgentId
          : null;
      const recipientAgentId = resolveRecipientAgentId(
        rawRecipientAgentId,
        'messaging.send_private',
        context,
      );
      const amount =
        typeof rawToolCall.arguments?.amount === 'string'
          ? rawToolCall.arguments.amount
          : undefined;
      const rationale =
        typeof rawToolCall.arguments?.rationale === 'string'
          ? rawToolCall.arguments.rationale
          : undefined;

      if (!recipientAgentId || !amount || !rationale) {
        throw new DomainInvariantError(
          'transfer.request_payment requires recipientAgentId, amount, and rationale from the model.',
        );
      }

      return {
        name: rawToolCall.name,
        arguments: {
          recipientAgentId,
          amount,
          rationale,
        },
      };
    }
    case 'transfer.counter_payment_request': {
      const proposalActionId =
        typeof rawToolCall.arguments?.proposalActionId === 'string'
          ? rawToolCall.arguments.proposalActionId
          : undefined;
      const rawRecipientAgentId =
        typeof rawToolCall.arguments?.recipientAgentId === 'string'
          ? rawToolCall.arguments.recipientAgentId
          : null;
      const recipientAgentId = resolveRecipientAgentId(
        rawRecipientAgentId,
        'messaging.send_private',
        context,
      );
      const amount =
        typeof rawToolCall.arguments?.amount === 'string'
          ? rawToolCall.arguments.amount
          : undefined;
      const rationale =
        typeof rawToolCall.arguments?.rationale === 'string'
          ? rawToolCall.arguments.rationale
          : undefined;

      if (!proposalActionId || !recipientAgentId || !amount || !rationale) {
        throw new DomainInvariantError(
          'transfer.counter_payment_request requires proposalActionId, recipientAgentId, amount, and rationale from the model.',
        );
      }

      return {
        name: rawToolCall.name,
        arguments: {
          proposalActionId,
          recipientAgentId,
          amount,
          rationale,
        },
      };
    }
    case 'transfer.accept_payment_request': {
      const proposalActionId =
        typeof rawToolCall.arguments?.proposalActionId === 'string'
          ? rawToolCall.arguments.proposalActionId
          : undefined;

      if (!proposalActionId) {
        throw new DomainInvariantError(
          'transfer.accept_payment_request requires proposalActionId from the model.',
        );
      }

      return {
        name: rawToolCall.name,
        arguments: {
          proposalActionId,
        },
      };
    }
    case 'transfer.reject_payment_request': {
      const proposalActionId =
        typeof rawToolCall.arguments?.proposalActionId === 'string'
          ? rawToolCall.arguments.proposalActionId
          : undefined;
      const rationale =
        typeof rawToolCall.arguments?.rationale === 'string'
          ? rawToolCall.arguments.rationale
          : undefined;

      if (!proposalActionId || !rationale) {
        throw new DomainInvariantError(
          'transfer.reject_payment_request requires proposalActionId and rationale from the model.',
        );
      }

      return {
        name: rawToolCall.name,
        arguments: {
          proposalActionId,
          rationale,
        },
      };
    }
    case 'treasury.place_with_banker':
    case 'treasury.redeem_from_banker': {
      const rawRecipientAgentId =
        typeof rawToolCall.arguments?.recipientAgentId === 'string'
          ? rawToolCall.arguments.recipientAgentId
          : null;
      const recipientAgentId = resolveRecipientAgentId(
        rawRecipientAgentId,
        rawToolCall.name,
        context,
      );
      const amount =
        typeof rawToolCall.arguments?.amount === 'string'
          ? rawToolCall.arguments.amount
          : undefined;

      if (!recipientAgentId || !amount) {
        throw new DomainInvariantError(
          `${rawToolCall.name} requires recipientAgentId and amount from the model.`,
        );
      }

      return {
        name: rawToolCall.name,
        arguments: {
          recipientAgentId,
          amount,
        },
      };
    }
    case 'market.open_position': {
      const rawOpportunityId =
        typeof rawToolCall.arguments?.opportunityId === 'string'
          ? rawToolCall.arguments.opportunityId
          : null;
      const opportunityId = resolveOpportunityId(rawOpportunityId, context);

      if (!opportunityId) {
        throw new DomainInvariantError(
          'market.open_position requires opportunityId from the model.',
        );
      }

      const amount = normalizeOpenMarketPositionAmount(
        typeof rawToolCall.arguments?.amount === 'string'
          ? rawToolCall.arguments.amount
          : undefined,
        opportunityId,
        context,
      );

      if (!amount) {
        throw new DomainInvariantError(
          'market.open_position requires amount from the model.',
        );
      }

      return {
        name: rawToolCall.name,
        arguments: {
          opportunityId,
          amount,
        },
      };
    }
    case 'turn.finalize':
      return {
        name: rawToolCall.name,
        arguments: {},
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
  const nameMatch = rawText.match(
    /"name"\s*:\s*"(messaging\.send_public|messaging\.send_private)"/u,
  );

  if (!nameMatch) {
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
    name: nameMatch[1] as MessageStreamPreview['name'],
    recipientAgentId:
      recipientMatch?.[1] === 'null' ? null : (recipientMatch?.[2] ?? null),
    content: decodeJsonFragment(contentMatch[1] ?? ''),
  };
}

function logParsedToolCall(
  context: AgentTurnContext,
  parsedToolCall: AgentToolCallParams,
) {
  console.info(
    JSON.stringify({
      type: 'agent_decision',
      gameSessionId: context.gameId,
      turnNumber: context.turnNumber,
      agentId: context.self.agentId,
      agentName: context.self.name,
      role: context.self.role,
      toolName: parsedToolCall.name,
      toolArguments: parsedToolCall.arguments,
    }),
  );
}

function toFinalizedToolCall(outputText: string, context: AgentTurnContext) {
  return parseAgentToolCallParams(
    normalizeAgentDecision(JSON.parse(outputText) as RawAgentToolCall, context),
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
    preview.name === 'messaging.send_private' ? 'private' : 'public';
  const recipientAgentId =
    preview.name === 'messaging.send_private' ? preview.recipientAgentId : null;

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
  ): Promise<AgentToolCallParams> {
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

      const parsedToolCall = toFinalizedToolCall(outputText, context);

      if (
        callbacks &&
        (parsedToolCall.name === 'messaging.send_private' ||
          parsedToolCall.name === 'messaging.send_public')
      ) {
        const visibility =
          parsedToolCall.name === 'messaging.send_private'
            ? 'private'
            : 'public';
        const recipientAgentId =
          parsedToolCall.name === 'messaging.send_private'
            ? parsedToolCall.arguments.recipientAgentId
            : null;
        const content = parsedToolCall.arguments.content;
        const streamId = activeStream?.streamId ?? randomUUID();

        if (!activeStream) {
          callbacks.onMessageStreamStarted({
            streamId,
            visibility,
            recipientAgentId,
          });
        }

        if ((activeStream?.content ?? '') !== content) {
          callbacks.onMessageStreamDelta({
            streamId,
            visibility,
            recipientAgentId,
            delta: content.slice(activeStream?.content.length ?? 0),
            content,
          });
        }

        callbacks.onMessageStreamCompleted({
          streamId,
          visibility,
          recipientAgentId,
          content,
        });
      } else if (callbacks && activeStream) {
        callbacks.onMessageStreamAborted({
          streamId: activeStream.streamId,
          visibility: activeStream.visibility,
          recipientAgentId: activeStream.recipientAgentId,
          content: activeStream.content,
        });
      }

      logParsedToolCall(context, parsedToolCall);

      return parsedToolCall;
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
        name: 'turn.finalize',
        arguments: {},
      };
    }
  }
}
