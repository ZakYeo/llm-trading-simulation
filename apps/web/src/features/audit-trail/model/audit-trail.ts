import type { GameReplayRecord } from '../../../lib/api';
import {
  formatBasisPoints,
  formatCurrency,
  formatSignedCurrency,
  formatTimestamp,
  getReplayEventDetail,
  getReplayEventLabel,
} from '../../../lib/formatters';

export interface StreamedAuditMessageRecord {
  streamId: string;
  gameSessionId: string;
  roundNumber: number;
  turnNumber: number;
  senderAgentId: string;
  senderAgentName: string;
  recipientAgentId: string | null;
  recipientAgentName?: string;
  visibility: 'public' | 'private';
  content: string;
  occurredAt: string;
  status: 'streaming' | 'completed';
  messageId?: string;
}

export type AuditTrailEvent = GameReplayRecord['events'][number] & {
  isStreaming?: boolean;
  streamingStatus?: StreamedAuditMessageRecord['status'];
  animationKey?: string;
};

export interface AuditTrailMetaItem {
  label: string;
  value: string;
}

export interface AuditTrailParticipantRow {
  key: string;
  ownerAgentName: string;
  principalLabel: string;
  profitOrLossLabel: string;
}

export type AuditTrailTimelineEvent = AuditTrailEvent & {
  animationId: string;
  badgeLabel: string;
  detail: string | null;
  isMarketOpportunityEvent: boolean;
  label: string;
  listedMeta: AuditTrailMetaItem[];
  participantRows: AuditTrailParticipantRow[];
  resolvedMeta: AuditTrailMetaItem[];
  roundLabel: string;
  timestampLabel: string;
};

export type ReplayFilter =
  | 'all'
  | 'treasury'
  | 'market'
  | 'messages'
  | 'actions'
  | 'transfers';
export type ReplayWindow = '5' | '10' | '20' | 'all';
export type ReplayRoundWindow = '1' | '3' | '5' | 'all';

export const replayFilters: ReplayFilter[] = [
  'all',
  'treasury',
  'market',
  'messages',
  'actions',
  'transfers',
];

export interface AuditTrailViewData {
  mergedEvents: AuditTrailTimelineEvent[];
  visibleEvents: AuditTrailTimelineEvent[];
  visibleStreamedMessages: StreamedAuditMessageRecord[];
  eventsByRound: Array<{
    roundNumber: number;
    events: AuditTrailTimelineEvent[];
  }>;
}

function getMessageAnimationKey(
  event: GameReplayRecord['events'][number],
  streamedMessages: StreamedAuditMessageRecord[],
) {
  if (event.type !== 'message') {
    return undefined;
  }

  const matchingStreamedMessage = streamedMessages.find((streamedMessage) => {
    if (streamedMessage.messageId) {
      return streamedMessage.messageId === event.id;
    }

    return (
      streamedMessage.roundNumber === event.roundNumber &&
      streamedMessage.turnNumber === event.turnNumber &&
      streamedMessage.senderAgentId === event.senderAgentId &&
      streamedMessage.content === event.content
    );
  });

  return matchingStreamedMessage
    ? `stream-message-${matchingStreamedMessage.streamId}`
    : `message-${event.id}`;
}

function getActionAnimationKey(
  event: GameReplayRecord['events'][number],
  streamedMessages: StreamedAuditMessageRecord[],
) {
  if (
    event.type !== 'action' ||
    (event.actionType !== 'send_private_message' &&
      event.actionType !== 'send_public_message')
  ) {
    return undefined;
  }

  const matchingStreamedMessage = streamedMessages.find(
    (streamedMessage) =>
      streamedMessage.roundNumber === event.roundNumber &&
      streamedMessage.turnNumber === event.turnNumber &&
      streamedMessage.senderAgentId === event.agentId &&
      event.actionType ===
        (streamedMessage.visibility === 'private'
          ? 'send_private_message'
          : 'send_public_message'),
  );

  return matchingStreamedMessage
    ? `stream-action-${matchingStreamedMessage.streamId}`
    : `action-${event.id}`;
}

function getAnimationKey(
  event: GameReplayRecord['events'][number],
  streamedMessages: StreamedAuditMessageRecord[],
) {
  return (
    getMessageAnimationKey(event, streamedMessages) ??
    getActionAnimationKey(event, streamedMessages) ??
    event.id
  );
}

function matchesFilter(filter: ReplayFilter, event: AuditTrailEvent) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'treasury') {
    return (
      event.type === 'custody_placement' ||
      event.type === 'custody_redemption' ||
      event.type === 'custody_accrual'
    );
  }

  if (filter === 'messages') {
    return event.type === 'message';
  }

  if (filter === 'actions') {
    return event.type === 'action';
  }

  if (filter === 'market') {
    return (
      event.type === 'market_opportunity_listed' ||
      event.type === 'market_position_opened' ||
      event.type === 'market_position_settled' ||
      event.type === 'market_opportunity_resolved'
    );
  }

  return (
    event.type === 'transfer' ||
    event.type === 'deposit' ||
    event.type === 'withdrawal'
  );
}

function createMarketListedMeta(event: AuditTrailEvent): AuditTrailMetaItem[] {
  if (event.type !== 'market_opportunity_listed') {
    return [];
  }

  return [
    {
      label: 'Risk',
      value: event.opportunityRiskLevel ?? '',
    },
    {
      label: 'Window',
      value: `R${event.listedRound} to R${event.settlementRound}`,
    },
    {
      label: 'Commitment',
      value:
        event.minCommitment && event.maxCommitment
          ? `${formatCurrency(event.minCommitment)} - ${formatCurrency(event.maxCommitment)}`
          : 'N/A',
    },
    {
      label: 'Range',
      value:
        typeof event.worstCaseReturnBps === 'number' &&
        typeof event.bestCaseReturnBps === 'number'
          ? `${formatBasisPoints(event.worstCaseReturnBps)} to ${formatBasisPoints(event.bestCaseReturnBps)}`
          : 'N/A',
    },
  ];
}

function createMarketResolvedMeta(
  event: AuditTrailEvent,
): AuditTrailMetaItem[] {
  if (event.type !== 'market_opportunity_resolved') {
    return [];
  }

  return [
    {
      label: 'Participants',
      value: String(event.participantCount ?? 0),
    },
    {
      label: 'Total principal',
      value: event.totalPrincipal
        ? formatCurrency(event.totalPrincipal)
        : '0.00',
    },
    {
      label: 'Net PnL',
      value: event.totalProfitOrLoss
        ? formatSignedCurrency(event.totalProfitOrLoss)
        : '0.00',
    },
    {
      label: 'Window',
      value: `R${event.listedRound} to R${event.settlementRound}`,
    },
  ];
}

function createParticipantRows(
  event: AuditTrailEvent,
): AuditTrailParticipantRow[] {
  if (event.type !== 'market_opportunity_resolved') {
    return [];
  }

  return (
    event.participantSettlements?.map((participant) => ({
      key: `${event.id}-${participant.ownerAgentId}`,
      ownerAgentName: participant.ownerAgentName,
      principalLabel: formatCurrency(participant.principal),
      profitOrLossLabel: formatSignedCurrency(participant.profitOrLoss),
    })) ?? []
  );
}

function createTimelineEvent(
  event: AuditTrailEvent,
  selectedRound: number | undefined,
): AuditTrailTimelineEvent {
  const isMarketOpportunityEvent =
    event.type === 'market_opportunity_listed' ||
    event.type === 'market_opportunity_resolved';
  const detail =
    event.isStreaming && event.type === 'message'
      ? (event.content ?? '')
      : getReplayEventDetail(event);

  return {
    ...event,
    animationId: event.animationKey ?? event.id,
    badgeLabel: event.type.replace(/_/gu, ' '),
    detail,
    isMarketOpportunityEvent,
    label: getReplayEventLabel(event),
    listedMeta: createMarketListedMeta(event),
    participantRows: createParticipantRows(event),
    resolvedMeta: createMarketResolvedMeta(event),
    roundLabel: `Round ${event.roundNumber ?? selectedRound ?? 0}${
      event.turnNumber ? ` / Turn ${event.turnNumber}` : ''
    }`,
    timestampLabel: formatTimestamp(event.createdAt),
  };
}

export function createAuditTrailViewData(input: {
  replay?: GameReplayRecord;
  streamedMessages?: StreamedAuditMessageRecord[];
  selectedRound?: number;
  activeFilter: ReplayFilter;
  activeWindow: ReplayWindow;
  activeRoundWindow: ReplayRoundWindow;
}): AuditTrailViewData {
  const {
    replay,
    streamedMessages = [],
    selectedRound,
    activeFilter,
    activeWindow,
    activeRoundWindow,
  } = input;
  const persistedEvents = replay?.events ?? [];
  const hasPersistedStreamAction = (
    streamedMessage: StreamedAuditMessageRecord,
  ) =>
    persistedEvents.some((event) => {
      if (event.type !== 'action') {
        return false;
      }

      return (
        event.roundNumber === streamedMessage.roundNumber &&
        event.turnNumber === streamedMessage.turnNumber &&
        event.agentId === streamedMessage.senderAgentId &&
        event.actionType ===
          (streamedMessage.visibility === 'private'
            ? 'send_private_message'
            : 'send_public_message')
      );
    });
  const visibleStreamedMessages = streamedMessages.filter(
    (streamedMessage) =>
      !persistedEvents.some((event) => event.id === streamedMessage.messageId),
  );
  const mergedEvents: AuditTrailEvent[] = [
    ...persistedEvents.map((event) => ({
      ...event,
      animationKey: getAnimationKey(event, streamedMessages),
    })),
    ...visibleStreamedMessages.flatMap((streamedMessage) => {
      const events: AuditTrailEvent[] = [];

      if (!hasPersistedStreamAction(streamedMessage)) {
        events.push({
          id: `stream-action-${streamedMessage.streamId}`,
          type: 'action',
          createdAt: streamedMessage.occurredAt,
          roundNumber: streamedMessage.roundNumber,
          turnNumber: streamedMessage.turnNumber,
          agentId: streamedMessage.senderAgentId,
          agentName: streamedMessage.senderAgentName,
          recipientAgentId: streamedMessage.recipientAgentId,
          content: streamedMessage.content,
          actionType:
            streamedMessage.visibility === 'private'
              ? 'send_private_message'
              : 'send_public_message',
          isStreaming: true,
          streamingStatus: streamedMessage.status,
          animationKey: `stream-action-${streamedMessage.streamId}`,
        });
      }

      if (
        streamedMessage.content.length > 0 ||
        streamedMessage.status === 'completed'
      ) {
        events.push({
          id: `stream-message-${streamedMessage.streamId}`,
          type: 'message',
          createdAt: streamedMessage.occurredAt,
          roundNumber: streamedMessage.roundNumber,
          turnNumber: streamedMessage.turnNumber,
          senderAgentId: streamedMessage.senderAgentId,
          senderAgentName: streamedMessage.senderAgentName,
          recipientAgentId: streamedMessage.recipientAgentId,
          recipientAgentName: streamedMessage.recipientAgentName,
          visibility: streamedMessage.visibility,
          content: streamedMessage.content,
          isStreaming: true,
          streamingStatus: streamedMessage.status,
          animationKey: `stream-message-${streamedMessage.streamId}`,
        });
      }

      return events;
    }),
  ].sort((left, right) => {
    const createdAtCompare = left.createdAt.localeCompare(right.createdAt);

    if (createdAtCompare !== 0) {
      return createdAtCompare;
    }

    return left.id.localeCompare(right.id);
  });
  const matchingEvents = mergedEvents.filter((event) =>
    matchesFilter(activeFilter, event),
  );
  const latestRoundNumber = matchingEvents.reduce(
    (latestRound, event) => Math.max(latestRound, event.roundNumber ?? 0),
    selectedRound ?? 0,
  );
  const roundFilteredEvents =
    activeRoundWindow === 'all'
      ? matchingEvents
      : matchingEvents.filter((event) => {
          const roundNumber = event.roundNumber ?? 0;

          return (
            roundNumber >=
            latestRoundNumber - Number.parseInt(activeRoundWindow, 10) + 1
          );
        });
  const visibleEvents =
    activeWindow === 'all'
      ? roundFilteredEvents
      : roundFilteredEvents.slice(-Number.parseInt(activeWindow, 10));
  const timelineEvents = visibleEvents.map((event) =>
    createTimelineEvent(event, selectedRound),
  );
  const eventsByRound = timelineEvents.reduce<
    Array<{
      roundNumber: number;
      events: AuditTrailTimelineEvent[];
    }>
  >((groups, event) => {
    const roundNumber = event.roundNumber ?? selectedRound ?? 0;
    const existingGroup = groups.find(
      (group) => group.roundNumber === roundNumber,
    );

    if (existingGroup) {
      existingGroup.events.push(event);
      return groups;
    }

    groups.push({ roundNumber, events: [event] });
    return groups;
  }, []);

  return {
    mergedEvents: mergedEvents.map((event) =>
      createTimelineEvent(event, selectedRound),
    ),
    visibleEvents: timelineEvents,
    visibleStreamedMessages,
    eventsByRound,
  };
}
