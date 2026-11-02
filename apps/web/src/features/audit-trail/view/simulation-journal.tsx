import { useLayoutEffect, useRef } from 'react';
import { Skeleton } from '../../../shared/ui/skeleton';
import type { AuditTrailTimelineEvent } from '../model/audit-trail';
import type { SimulationJournalViewModel } from '../view-model/use-simulation-journal';
import { EventEntry } from './event-entry';

export function SimulationJournal({
  viewModel,
  onInspect,
  isFetching,
  isLoading,
}: {
  viewModel: SimulationJournalViewModel;
  onInspect: (event: AuditTrailTimelineEvent) => void;
  isFetching: boolean;
  isLoading: boolean;
}) {
  const feed = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  useLayoutEffect(() => {
    if (following.current && feed.current)
      feed.current.scrollTop = feed.current.scrollHeight;
  }, [viewModel.groups]);
  return (
    <section className="journal" aria-label="Simulation journal">
      <header className="journal-heading">
        <div>
          <span className="eyebrow">Live conversation &amp; activity</span>
          <h2>Round {viewModel.currentRound}</h2>
        </div>
        <div className="journal-navigation">
          {viewModel.groups.length > 0 && (
            <button
              className="quiet-button"
              type="button"
              onClick={() => {
                const latest = document.getElementById('journal-latest');
                following.current = true;
                latest?.scrollIntoView({
                  block: 'nearest',
                  behavior: window.matchMedia(
                    '(prefers-reduced-motion: reduce)',
                  ).matches
                    ? 'auto'
                    : 'smooth',
                });
                latest?.focus({ preventScroll: true });
              }}
            >
              Jump to latest activity ↓
            </button>
          )}
          <label className="field">
            <span className="sr-only">Journal rounds</span>
            <select
              value={viewModel.rounds}
              onChange={(event) => viewModel.setRounds(event.target.value)}
            >
              <option value="current">Current round</option>
              <option value="all">All rounds</option>
            </select>
          </label>
        </div>
      </header>
      <div
        className="journal-feed"
        ref={feed}
        role="region"
        aria-label="Conversation activity"
        tabIndex={0}
        onScroll={() => {
          const element = feed.current;
          if (element)
            following.current =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              48;
        }}
      >
        {isFetching && !isLoading && (
          <p className="empty-copy">Updating activity…</p>
        )}
        {isLoading ? (
          <Skeleton label="Loading activity" />
        ) : viewModel.groups.length === 0 && viewModel.pendingCount > 0 ? (
          <p role="status">New activity arriving…</p>
        ) : viewModel.groups.length === 0 ? (
          <div className="journal-empty">
            <span className="journal-empty-mark" aria-hidden="true">
              “
            </span>
            <h3>The conversation starts here.</h3>
            <p>
              Run a turn to see what your agents decide. Their messages and
              actions will appear in this journal.
            </p>
          </div>
        ) : (
          viewModel.groups.map((group) => (
            <section
              key={group.roundNumber}
              className="round-group"
              aria-label={`Journal round ${group.roundNumber}`}
            >
              <div className="round-divider">
                <strong>Round {group.roundNumber}</strong>
                <span>{group.events.length} events</span>
              </div>
              {group.events.map((event) => (
                <EventEntry
                  key={event.animationId}
                  event={event}
                  compact
                  onInspect={onInspect}
                />
              ))}
            </section>
          ))
        )}
        {viewModel.groups.length > 0 && (
          <div id="journal-latest" className="journal-end" tabIndex={-1}>
            <span className="sr-only">Latest journal activity</span>
          </div>
        )}
      </div>
      {viewModel.pendingCount > 0 && (
        <p className="field-note" role="status">
          Showing new activity…
        </p>
      )}
    </section>
  );
}
