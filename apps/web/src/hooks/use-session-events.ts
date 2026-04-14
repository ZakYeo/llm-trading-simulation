import { useEffect } from 'react';

import {
  createAgentSessionEventSource,
  type AgentSessionEventRecord,
} from '../lib/api';

interface UseSessionEventsInput {
  queryClient: {
    invalidateQueries: (input: {
      queryKey: readonly [string, string?];
    }) => Promise<unknown>;
  };
  selectedSessionId: string;
  setLatestRunSummary: (value: string) => void;
}

export function createSessionEventHandlers({
  queryClient,
  selectedSessionId,
  setLatestRunSummary,
}: UseSessionEventsInput) {
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

  function handleActionProgressed(event: MessageEvent<string>) {
    const payload = JSON.parse(event.data) as AgentSessionEventRecord;

    if (payload.type !== 'action_progressed') {
      return;
    }

    setLatestRunSummary(
      `${payload.agentName} progressed ${payload.actionType} on turn ${payload.turnNumber}.`,
    );
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
    handleTransferSettled,
    handleTurnCompleted,
    handleRoundCompleted,
  };
}

export function useSessionEvents({
  queryClient,
  selectedSessionId,
  setLatestRunSummary,
}: UseSessionEventsInput) {
  useEffect(() => {
    if (!selectedSessionId) {
      return undefined;
    }

    const eventSource = createAgentSessionEventSource(selectedSessionId);
    const {
      handleActionProgressed,
      handleTransferSettled,
      handleTurnCompleted,
      handleRoundCompleted,
    } = createSessionEventHandlers({
      queryClient,
      selectedSessionId,
      setLatestRunSummary,
    });

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
  }, [queryClient, selectedSessionId, setLatestRunSummary]);
}
