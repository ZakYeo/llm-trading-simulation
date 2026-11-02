import { Skeleton } from '../../../shared/ui/skeleton';
import type { RoundSummaryViewModel } from '../view-model/use-round-summary-view-model';

export function RoundSummaryCard({ vm }: { vm: RoundSummaryViewModel }) {
  return (
    <section
      className="context-section round-summary"
      role="region"
      aria-label="AI summary this round"
    >
      <header className="section-heading">
        <h2>AI summary this round</h2>
        <span className="field-note">Round {vm.roundNumber}</span>
      </header>
      {vm.isRunning ? (
        <>
          <Skeleton label="Waiting for round summary" rows={1} />
          <p className="field-note">
            The summary updates after this run finishes.
          </p>
        </>
      ) : vm.isLoading ? (
        <Skeleton label="Loading round summary" rows={1} />
      ) : vm.error || vm.summary?.status === 'unavailable' ? (
        <p className="empty-copy">
          Summary unavailable. Your recorded activity is still available. A new
          summary will be attempted after the next run.
        </p>
      ) : vm.summary?.text ? (
        <>
          <p className="round-summary-text">{vm.summary.text}</p>
          <p className="field-note">
            {vm.summary.provider === 'mock' ? 'Mock runtime · ' : ''}
            {vm.summary.includedEventCount} of {vm.summary.eventCount} recorded
            events · {vm.generatedAtLabel}
          </p>
          {vm.isStale && (
            <p className="field-note">
              More activity has been recorded since this summary.
            </p>
          )}
        </>
      ) : (
        <p className="empty-copy">
          Run turns to generate a summary for this round.
        </p>
      )}
    </section>
  );
}
