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
}: {
  replay?: GameReplayRecord;
  streamedMessages: StreamedAuditMessageRecord[];
  selectedRound?: number;
  sessionId: string;
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
  const groups =
    rounds === 'all'
      ? data.eventsByRound
      : data.eventsByRound.filter(
          (group) => group.roundNumber === selectedRound,
        );
  return {
    groups,
    rounds,
    setRounds: (rounds: string) => setSelection({ sessionId, rounds }),
    currentRound: selectedRound ?? 1,
  };
}
export type SimulationJournalViewModel = ReturnType<
  typeof useSimulationJournal
>;
