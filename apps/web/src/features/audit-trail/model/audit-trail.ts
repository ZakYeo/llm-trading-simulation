import type { GameReplayRecord } from '../../../lib/api';
import type { StreamedAuditMessageRecord } from '../view-model/use-session-events';

export type AuditTrailEvent = GameReplayRecord['events'][number] & {
  isStreaming?: boolean;
  streamingStatus?: StreamedAuditMessageRecord['status'];
  animationKey?: string;
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
  mergedEvents: AuditTrailEvent[];
  visibleEvents: AuditTrailEvent[];
  visibleStreamedMessages: StreamedAuditMessageRecord[];
  eventsByRound: Array<{
    roundNumber: number;
    events: AuditTrailEvent[];
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

function matchesFilter(
  filter: ReplayFilter,
  event: GameReplayRecord['events'][number],
) {
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
  const eventsByRound = visibleEvents.reduce<
    Array<{
      roundNumber: number;
      events: AuditTrailEvent[];
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
    mergedEvents,
    visibleEvents,
    visibleStreamedMessages,
    eventsByRound,
  };
}
