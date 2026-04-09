import { useEffect } from 'react';

import {
  createAgentSessionEventSource,
  type AgentSessionEventRecord,
} from '../lib/api';

interface UseSessionEventsInput {
  queryClient: {
    invalidateQueries: (input: {
      queryKey: readonly [string, string];
    }) => Promise<unknown>;
  };
  selectedSessionId: string;
  setLatestRunSummary: (value: string) => void;
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

    function refreshLiveState() {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['game-session', selectedSessionId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['game-replay', selectedSessionId],
        }),
      ]);
    }

    function handleActionProgressed(event: MessageEvent<string>) {
      const payload = JSON.parse(event.data) as AgentSessionEventRecord;

      setLatestRunSummary(
        `${payload.agentName ?? 'Agent'} progressed ${payload.actionType ?? 'an action'} on turn ${payload.turnNumber ?? '?'}.`,
      );
      refreshLiveState();
    }

    function handleTransferSettled(event: MessageEvent<string>) {
      const payload = JSON.parse(event.data) as AgentSessionEventRecord;

      setLatestRunSummary(
        `Transfer settled on turn ${payload.turnNumber ?? '?'} for ${payload.amount ?? '0.0000'}.`,
      );
      refreshLiveState();
    }

    function handleTurnCompleted(event: MessageEvent<string>) {
      const payload = JSON.parse(event.data) as AgentSessionEventRecord;

      setLatestRunSummary(
        `Turn ${payload.turnNumber ?? '?'} completed with ${payload.actionCount ?? 0} actions and ${payload.messageCount ?? 0} messages.`,
      );
    }

    function handleRoundCompleted(event: MessageEvent<string>) {
      const payload = JSON.parse(event.data) as AgentSessionEventRecord;

      setLatestRunSummary(
        `Round ${payload.roundNumber} finished after ${payload.turnCount ?? 0} turn${payload.turnCount === 1 ? '' : 's'}.`,
      );
      refreshLiveState();
    }

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
