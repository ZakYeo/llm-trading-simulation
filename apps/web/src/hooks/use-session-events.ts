import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';

import {
  createAgentSessionEventSource,
  type AgentSessionEventRecord,
  type GameReplayRecord,
} from '../lib/api';

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

interface UseSessionEventsInput {
  queryClient: {
    invalidateQueries: (input: {
      queryKey: readonly [string, string?];
    }) => Promise<unknown>;
  };
  replay?: GameReplayRecord;
  selectedSessionId: string;
  setLatestRunSummary: (value: string) => void;
  setStreamedMessages: Dispatch<SetStateAction<StreamedAuditMessageRecord[]>>;
}

function upsertStreamedMessage(
  current: StreamedAuditMessageRecord[],
  next: StreamedAuditMessageRecord,
) {
  const existingIndex = current.findIndex(
    (message) => message.streamId === next.streamId,
  );

  if (existingIndex === -1) {
    return [...current, next];
  }

  return current.map((message, index) =>
    index === existingIndex ? { ...message, ...next } : message,
  );
}

export function createSessionEventHandlers({
  queryClient,
  selectedSessionId,
  setLatestRunSummary,
  setStreamedMessages,
}: Omit<UseSessionEventsInput, 'replay'>) {
  function refreshLiveState() {
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['game-session', selectedSessionId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['game-replay', selectedSessionId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['game-sessions'],
      }),
    ]);
  }

  function handleMessageStreamStarted(event: MessageEvent<string>) {
    const payload = JSON.parse(event.data) as AgentSessionEventRecord;

    if (payload.type !== 'message_stream_started') {
      return;
    }

    setLatestRunSummary(`${payload.agentName} is drafting a message...`);
    setStreamedMessages((current) =>
      upsertStreamedMessage(current, {
        streamId: payload.streamId,
        gameSessionId: payload.gameSessionId,
        roundNumber: payload.roundNumber,
        turnNumber: payload.turnNumber,
        senderAgentId: payload.agentId,
        senderAgentName: payload.agentName,
        recipientAgentId: payload.recipientAgentId,
        recipientAgentName: payload.recipientAgentName,
        visibility: payload.visibility,
        content: '',
        occurredAt: payload.occurredAt,
        status: 'streaming',
      }),
    );
  }

  function handleMessageStreamDelta(event: MessageEvent<string>) {
    const payload = JSON.parse(event.data) as AgentSessionEventRecord;

    if (payload.type !== 'message_stream_delta') {
      return;
    }

    setLatestRunSummary(`${payload.agentName} is drafting a message...`);
    setStreamedMessages((current) =>
      upsertStreamedMessage(current, {
        streamId: payload.streamId,
        gameSessionId: payload.gameSessionId,
        roundNumber: payload.roundNumber,
        turnNumber: payload.turnNumber,
        senderAgentId: payload.agentId,
        senderAgentName: payload.agentName,
        recipientAgentId: payload.recipientAgentId,
        recipientAgentName: payload.recipientAgentName,
        visibility: payload.visibility,
        content: payload.content,
        occurredAt: payload.occurredAt,
        status: 'streaming',
      }),
    );
  }

  function handleMessageStreamCompleted(event: MessageEvent<string>) {
    const payload = JSON.parse(event.data) as AgentSessionEventRecord;

    if (payload.type !== 'message_stream_completed') {
      return;
    }

    setLatestRunSummary(
      `${payload.agentName} sent a message on turn ${payload.turnNumber}.`,
    );
    setStreamedMessages((current) =>
      upsertStreamedMessage(current, {
        streamId: payload.streamId,
        gameSessionId: payload.gameSessionId,
        roundNumber: payload.roundNumber,
        turnNumber: payload.turnNumber,
        senderAgentId: payload.agentId,
        senderAgentName: payload.agentName,
        recipientAgentId: payload.recipientAgentId,
        recipientAgentName: payload.recipientAgentName,
        visibility: payload.visibility,
        content: payload.content,
        occurredAt: payload.occurredAt,
        status: 'completed',
      }),
    );
  }

  function handleMessageStreamAborted(event: MessageEvent<string>) {
    const payload = JSON.parse(event.data) as AgentSessionEventRecord;

    if (payload.type !== 'message_stream_aborted') {
      return;
    }

    setStreamedMessages((current) =>
      current.filter((message) => message.streamId !== payload.streamId),
    );
  }

  function handleActionProgressed(event: MessageEvent<string>) {
    const payload = JSON.parse(event.data) as AgentSessionEventRecord;

    if (payload.type !== 'action_progressed') {
      return;
    }

    setLatestRunSummary(
      `${payload.agentName} progressed ${payload.actionType} on turn ${payload.turnNumber}.`,
    );

    if (payload.streamId && payload.messageId) {
      setStreamedMessages((current) =>
        current.map((message) =>
          message.streamId === payload.streamId
            ? { ...message, messageId: payload.messageId, status: 'completed' }
            : message,
        ),
      );
    }

    refreshLiveState();
  }

  function handleTransferSettled(event: MessageEvent<string>) {
    const payload = JSON.parse(event.data) as AgentSessionEventRecord;

    if (payload.type !== 'transfer_settled') {
      return;
    }

    setLatestRunSummary(
      `Transfer settled on turn ${payload.turnNumber} for ${payload.amount}.`,
    );
    refreshLiveState();
  }

  function handleTurnCompleted(event: MessageEvent<string>) {
    const payload = JSON.parse(event.data) as AgentSessionEventRecord;

    if (payload.type !== 'turn_completed') {
      return;
    }

    setLatestRunSummary(
      `Turn ${payload.turnNumber} completed with ${payload.actionCount} actions and ${payload.messageCount} messages.`,
    );
    refreshLiveState();
  }

  function handleRoundCompleted(event: MessageEvent<string>) {
    const payload = JSON.parse(event.data) as AgentSessionEventRecord;

    if (payload.type !== 'round_completed') {
      return;
    }

    setLatestRunSummary(
      `Round ${payload.roundNumber} finished after ${payload.turnCount} turn${payload.turnCount === 1 ? '' : 's'}.`,
    );
    refreshLiveState();
  }

  return {
    handleActionProgressed,
    handleMessageStreamAborted,
    handleMessageStreamCompleted,
    handleMessageStreamDelta,
    handleMessageStreamStarted,
    handleTransferSettled,
    handleTurnCompleted,
    handleRoundCompleted,
  };
}

function hasPersistedReplayMessage(
  replay: GameReplayRecord | undefined,
  streamedMessage: StreamedAuditMessageRecord,
) {
  if (!replay) {
    return false;
  }

  return replay.events.some((event) => {
    if (event.type !== 'message') {
      return false;
    }

    if (streamedMessage.messageId) {
      return event.id === streamedMessage.messageId;
    }

    return (
      event.roundNumber === streamedMessage.roundNumber &&
      event.turnNumber === streamedMessage.turnNumber &&
      event.senderAgentId === streamedMessage.senderAgentId &&
      event.recipientAgentId === streamedMessage.recipientAgentId &&
      event.visibility === streamedMessage.visibility &&
      event.content === streamedMessage.content
    );
  });
}

export function useSessionEvents({
  queryClient,
  replay,
  selectedSessionId,
  setLatestRunSummary,
  setStreamedMessages,
}: UseSessionEventsInput) {
  useEffect(() => {
    setStreamedMessages((current) =>
      current.filter(
        (message) =>
          message.gameSessionId === selectedSessionId &&
          !hasPersistedReplayMessage(replay, message),
      ),
    );
  }, [replay, selectedSessionId, setStreamedMessages]);

  useEffect(() => {
    if (!selectedSessionId) {
      return undefined;
    }

    const eventSource = createAgentSessionEventSource(selectedSessionId);
    const {
      handleActionProgressed,
      handleMessageStreamAborted,
      handleMessageStreamCompleted,
      handleMessageStreamDelta,
      handleMessageStreamStarted,
      handleTransferSettled,
      handleTurnCompleted,
      handleRoundCompleted,
    } = createSessionEventHandlers({
      queryClient,
      selectedSessionId,
      setLatestRunSummary,
      setStreamedMessages,
    });

    eventSource.addEventListener(
      'message_stream_started',
      handleMessageStreamStarted as EventListener,
    );
    eventSource.addEventListener(
      'message_stream_delta',
      handleMessageStreamDelta as EventListener,
    );
    eventSource.addEventListener(
      'message_stream_completed',
      handleMessageStreamCompleted as EventListener,
    );
    eventSource.addEventListener(
      'message_stream_aborted',
      handleMessageStreamAborted as EventListener,
    );
    eventSource.addEventListener(
      'action_progressed',
      handleActionProgressed as EventListener,
    );
    eventSource.addEventListener(
      'transfer_settled',
      handleTransferSettled as EventListener,
    );
    eventSource.addEventListener(
      'turn_completed',
      handleTurnCompleted as EventListener,
    );
    eventSource.addEventListener(
      'round_completed',
      handleRoundCompleted as EventListener,
    );

    return () => {
      eventSource.removeEventListener(
        'message_stream_started',
        handleMessageStreamStarted as EventListener,
      );
      eventSource.removeEventListener(
        'message_stream_delta',
        handleMessageStreamDelta as EventListener,
      );
      eventSource.removeEventListener(
        'message_stream_completed',
        handleMessageStreamCompleted as EventListener,
      );
      eventSource.removeEventListener(
        'message_stream_aborted',
        handleMessageStreamAborted as EventListener,
      );
      eventSource.removeEventListener(
        'action_progressed',
        handleActionProgressed as EventListener,
      );
      eventSource.removeEventListener(
        'transfer_settled',
        handleTransferSettled as EventListener,
      );
      eventSource.removeEventListener(
        'turn_completed',
        handleTurnCompleted as EventListener,
      );
      eventSource.removeEventListener(
        'round_completed',
        handleRoundCompleted as EventListener,
      );
      eventSource.close();
    };
  }, [
    queryClient,
    selectedSessionId,
    setLatestRunSummary,
    setStreamedMessages,
  ]);
}
