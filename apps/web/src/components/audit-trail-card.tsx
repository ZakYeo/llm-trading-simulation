import type {
  AuditTrailViewModel,
  ReplayRoundWindow,
  ReplayWindow,
} from '../features/audit-trail/view-model/use-audit-trail-view-model';

import {
  CardBody,
  CardCollapseButton,
  CardHeader,
  CardShell,
} from './card-shell';

export interface AuditTrailCardProps {
  inProgressLabel?: string;
  isFetching: boolean;
  isTurnFlowInProgress: boolean;
  latestRunSummary: string;
  viewModel: AuditTrailViewModel;
}

export function AuditTrailCard({
  inProgressLabel,
  isFetching,
  isTurnFlowInProgress,
  latestRunSummary,
  viewModel,
}: AuditTrailCardProps) {
  const {
    activeFilter,
    activeRoundWindow,
    activeWindow,
    animatedEventIds,
    eventsByRound,
    filterOptions,
    hasReplayActivity,
    isExpanded,
    mergedEventCount,
    roundWindowOptions,
    setActiveFilter,
    setActiveRoundWindow,
    setActiveWindow,
    timelineScrollRef,
    toggleExpanded,
    visibleEventCount,
    windowOptions,
  } = viewModel;

  return (
    <CardShell className="replay-panel">
      <CardHeader
        kicker="Replay"
        title="Audit Trail"
        actions={
          <>
            {hasReplayActivity ? (
              <span className="status-chip muted">
                {visibleEventCount} / {mergedEventCount} events
              </span>
            ) : null}
            <CardCollapseButton
              isExpanded={isExpanded}
              expandLabel="Maximise audit trail"
              collapseLabel="Minimise audit trail"
              onToggle={toggleExpanded}
            />
          </>
        }
      />

      <CardBody isExpanded={isExpanded}>
        <>
          {isTurnFlowInProgress ? (
            <div className="live-run-banner" aria-live="polite">
              <div className="live-run-indicator">
                <span className="live-run-dot" aria-hidden="true" />
                <strong>{inProgressLabel ?? 'Turn flow in progress'}</strong>
              </div>
              <span>
                {latestRunSummary || 'Waiting for the next agent event...'}
              </span>
            </div>
          ) : null}

          <div className="replay-toolbar">
            <div className="filter-row">
              {filterOptions.map((filter) => (
                <button
                  key={filter.value}
                  className={
                    filter.value === activeFilter
                      ? 'filter-chip active'
                      : 'filter-chip'
                  }
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <label className="field replay-window-field">
              <span>Events</span>
              <select
                value={activeWindow}
                onChange={(event) =>
                  setActiveWindow(event.target.value as ReplayWindow)
                }
              >
                {windowOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field replay-window-field">
              <span>Rounds</span>
              <select
                value={activeRoundWindow}
                onChange={(event) =>
                  setActiveRoundWindow(event.target.value as ReplayRoundWindow)
                }
              >
                {roundWindowOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isFetching ? <p>Loading replay...</p> : null}

          <div ref={timelineScrollRef} className="timeline-scroll">
            {hasReplayActivity ? (
              visibleEventCount > 0 ? (
                <div className="timeline">
                  {eventsByRound.map((group) => (
                    <section key={group.roundNumber} className="round-group">
                      <div className="round-divider">
                        <span>Round {group.roundNumber}</span>
                        <strong>{group.events.length} event(s)</strong>
                      </div>

                      {group.events.map((event) => {
                        return (
                          <article
                            key={event.id}
                            className={
                              animatedEventIds.includes(event.animationId)
                                ? `timeline-event${event.isMarketOpportunityEvent ? ' market-opportunity-event' : ''} timeline-event-enter`
                                : `timeline-event${event.isMarketOpportunityEvent ? ' market-opportunity-event' : ''}`
                            }
                          >
                            <div className={`event-badge event-${event.type}`}>
                              {event.badgeLabel}
                            </div>
                            <div className="event-content">
                              <div className="event-topline">
                                <strong>{event.label}</strong>
                                <span>{event.timestampLabel}</span>
                              </div>
                              {event.detail &&
                              !event.isMarketOpportunityEvent ? (
                                <p className="event-detail">
                                  {event.detail}
                                  {event.isStreaming ? (
                                    <span
                                      className="streaming-cursor"
                                      aria-label={
                                        event.streamingStatus === 'streaming'
                                          ? 'Message typing in progress'
                                          : 'Live message persisted'
                                      }
                                    >
                                      {' '}
                                      |
                                    </span>
                                  ) : null}
                                </p>
                              ) : null}
                              {event.type === 'market_opportunity_listed' ? (
                                <dl className="event-meta-grid">
                                  {event.listedMeta.map((meta) => (
                                    <div key={meta.label}>
                                      <dt>{meta.label}</dt>
                                      <dd>{meta.value}</dd>
                                    </div>
                                  ))}
                                </dl>
                              ) : null}
                              {event.type === 'market_opportunity_resolved' ? (
                                <>
                                  <dl className="event-meta-grid">
                                    {event.resolvedMeta.map((meta) => (
                                      <div key={meta.label}>
                                        <dt>{meta.label}</dt>
                                        <dd>{meta.value}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                  <div className="event-participants">
                                    {event.participantRows.length ? (
                                      event.participantRows.map(
                                        (participant) => (
                                          <div
                                            key={participant.key}
                                            className="event-participant-row"
                                          >
                                            <strong>
                                              {participant.ownerAgentName}
                                            </strong>
                                            <span>
                                              Principal{' '}
                                              {participant.principalLabel}
                                            </span>
                                            <span>
                                              PnL{' '}
                                              {participant.profitOrLossLabel}
                                            </span>
                                          </div>
                                        ),
                                      )
                                    ) : (
                                      <p className="event-detail">
                                        No traders bought this opportunity.
                                      </p>
                                    )}
                                  </div>
                                </>
                              ) : null}
                              <p className="event-meta">{event.roundLabel}</p>
                            </div>
                          </article>
                        );
                      })}
                    </section>
                  ))}
                </div>
              ) : (
                <div className="timeline-empty-state">
                  <p className="empty-copy">
                    No replay events match the current filter yet.
                  </p>
                </div>
              )
            ) : (
              <div className="timeline-empty-state">
                <p className="empty-copy">
                  Replay events will appear here after the selected session has
                  activity.
                </p>
              </div>
            )}
          </div>
        </>
      </CardBody>
    </CardShell>
  );
}
