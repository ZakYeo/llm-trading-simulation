import { useQuery } from '@tanstack/react-query';
import { getRoundSummary } from '../../../lib/api';
import { formatTimestamp } from '../../../lib/formatters';

export function useRoundSummaryViewModel({
  sessionId,
  roundNumber,
  isRunning,
  recordedEventCount,
}: {
  sessionId: string;
  roundNumber: number;
  isRunning: boolean;
  recordedEventCount: number;
}) {
  const query = useQuery({
    queryKey: ['round-summary', sessionId, roundNumber],
    queryFn: () => getRoundSummary(sessionId, roundNumber),
    enabled: sessionId.length > 0,
    retry: 1,
  });
  const summary = query.data;
  return {
    roundNumber,
    summary,
    isRunning,
    isLoading: query.isPending,
    error: query.error?.message,
    isStale: Boolean(summary && summary.eventCount < recordedEventCount),
    generatedAtLabel: summary ? formatTimestamp(summary.generatedAt) : '',
  };
}
export type RoundSummaryViewModel = ReturnType<typeof useRoundSummaryViewModel>;
