import type {
  AuditTrailViewModel,
  ReplayRoundWindow,
  ReplayWindow,
} from '../features/audit-trail/view-model/use-audit-trail-view-model';
import type { AuditTrailTimelineEvent } from '../features/audit-trail/model/audit-trail';
import { EventEntry } from '../features/audit-trail/view/event-entry';

export interface AuditTrailCardProps {
  inProgressLabel?: string;
  isFetching: boolean;
  isTurnFlowInProgress: boolean;
  latestRunSummary: string;
  viewModel: AuditTrailViewModel;
  onInspect?: (event: AuditTrailTimelineEvent) => void;
}
export function AuditTrailCard({
  viewModel: vm,
  onInspect,
  isFetching,
  isTurnFlowInProgress,
  inProgressLabel,
  latestRunSummary,
}: AuditTrailCardProps) {
  return (
    <section className="replay-panel" aria-label="Audit trail">
      <header className="section-heading">
        <div>
          <h2>Audit trail</h2>
          <p className="field-note">
            {vm.visibleEventCount} / {vm.mergedEventCount} events
          </p>
        </div>
        <div className="history-controls">
          <label className="field replay-window-field">
            <span>Events</span>
            <select
              value={vm.activeWindow}
              onChange={(event) =>
                vm.setActiveWindow(event.target.value as ReplayWindow)
              }
            >
              {vm.windowOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field replay-window-field">
            <span>Window</span>
            <select
              value={vm.activeRoundWindow}
              onChange={(event) =>
                vm.setActiveRoundWindow(event.target.value as ReplayRoundWindow)
              }
            >
              {vm.roundWindowOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="quiet-button"
            aria-expanded={vm.isExpanded}
            onClick={vm.toggleExpanded}
          >
            {vm.isExpanded ? 'Collapse history' : 'Expand history'}
          </button>
        </div>
      </header>
      <div hidden={!vm.isExpanded}>
        {isTurnFlowInProgress && (
          <p className="live-run-banner">
            {inProgressLabel ?? 'Turn flow in progress'} {latestRunSummary}
          </p>
        )}
        <div className="replay-toolbar">
          <div className="filter-row" aria-label="Event category">
            {vm.filterOptions.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={
                  vm.activeFilter === filter.value
                    ? 'filter-chip active'
                    : 'filter-chip'
                }
                aria-pressed={vm.activeFilter === filter.value}
                onClick={() => vm.setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        {isFetching && <p className="empty-copy">Loading replay…</p>}
        <div ref={vm.timelineScrollRef} className="timeline-scroll">
          {vm.visibleEventCount > 0 ? (
            vm.eventsByRound.map((group) => (
              <section key={group.roundNumber} className="round-group">
                <div className="round-divider">
                  <span>Round {group.roundNumber}</span>
                  <strong>{group.events.length} events</strong>
                </div>
                {group.events.map((event) => (
                  <EventEntry
                    key={event.animationId}
                    event={event}
                    onInspect={onInspect}
                  />
                ))}
              </section>
            ))
          ) : (
            <p className="empty-copy">
              {vm.hasReplayActivity
                ? 'No replay events match the current filter yet.'
                : 'Replay events will appear here after the selected session has activity.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
