import { usePacedJournalEvents } from './use-paced-journal-events';
import { useMemo, useState } from 'react';
import type { GameReplayRecord } from '@llm-sim/shared-types';
import {
  createAuditTrailViewData,
  type StreamedAuditMessageRecord,
} from '../model/audit-trail';

export function useSimulationJournal({
  replay,
  streamedMessages,
  selectedRound,
  sessionId,
  isLoading = false,
}: {
  replay?: GameReplayRecord;
  streamedMessages: StreamedAuditMessageRecord[];
  selectedRound?: number;
  sessionId: string;
  isLoading?: boolean;
}) {
  const [selection, setSelection] = useState({
    sessionId: '',
    rounds: 'current',
  });
  const rounds =
    selection.sessionId === sessionId ? selection.rounds : 'current';
  const data = useMemo(
    () =>
      createAuditTrailViewData({
        replay,
        streamedMessages,
        selectedRound,
        activeFilter: 'all',
        activeWindow: 'all',
        activeRoundWindow: 'all',
      }),
    [replay, streamedMessages, selectedRound],
  );
  const allGroups = useMemo(
    () =>
      rounds === 'all'
        ? data.eventsByRound
        : data.eventsByRound.filter(
            (group) => group.roundNumber === selectedRound,
          ),
    [rounds, data.eventsByRound, selectedRound],
  );
  const ids = useMemo(
    () =>
      allGroups.flatMap((group) =>
        group.events.map((event) => event.animationId),
      ),
    [allGroups],
  );
  const visibleIds = usePacedJournalEvents(
    ids,
    `${sessionId}:${rounds}:${selectedRound}`,
    isLoading,
  );
  const visible = new Set(visibleIds);
  const groups = allGroups
    .map((group) => ({
      ...group,
      events: group.events.filter((event) => visible.has(event.animationId)),
    }))
    .filter((group) => group.events.length > 0);
  return {
    groups,
    pendingCount: ids.length - visibleIds.length,
    rounds,
    setRounds: (rounds: string) => setSelection({ sessionId, rounds }),
    currentRound: selectedRound ?? 1,
  };
}
export type SimulationJournalViewModel = ReturnType<
  typeof useSimulationJournal
>;
