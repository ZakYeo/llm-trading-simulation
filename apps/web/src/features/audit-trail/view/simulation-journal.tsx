import type { AuditTrailTimelineEvent } from '../model/audit-trail';
import type { SimulationJournalViewModel } from '../view-model/use-simulation-journal';
import { EventEntry } from './event-entry';

export function SimulationJournal({
  viewModel,
  onInspect,
  isFetching,
}: {
  viewModel: SimulationJournalViewModel;
  onInspect: (event: AuditTrailTimelineEvent) => void;
  isFetching: boolean;
}) {
  return (
    <section className="journal" aria-label="Simulation journal">
      <header className="journal-heading">
        <div>
          <span className="eyebrow">Field notes</span>
          <h2>Round {viewModel.currentRound}</h2>
        </div>
        <div className="journal-navigation">
          {viewModel.groups.length > 0 && (
            <button
              className="quiet-button"
              type="button"
              onClick={() => {
                const latest = document.getElementById('journal-latest');
                latest?.scrollIntoView({ block: 'end' });
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
      {isFetching && <p className="empty-copy">Updating activity…</p>}
      {viewModel.groups.length === 0 ? (
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
    </section>
  );
}
