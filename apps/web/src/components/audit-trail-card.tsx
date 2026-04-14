import { useEffect, useRef, useState } from 'react';

import type { GameReplayRecord } from '../lib/api';
import {
  formatBasisPoints,
  formatCurrency,
  formatSignedCurrency,
  formatTimestamp,
  getReplayEventDetail,
  getReplayEventLabel,
} from '../lib/formatters';

import {
  CardBody,
  CardCollapseButton,
  CardHeader,
  CardShell,
} from './card-shell';

interface AuditTrailCardProps {
  replay?: GameReplayRecord;
  selectedRound?: number;
  isFetching: boolean;
  isTurnFlowInProgress: boolean;
  inProgressLabel?: string;
  latestRunSummary: string;
}

type ReplayFilter =
  | 'all'
  | 'treasury'
  | 'market'
  | 'messages'
  | 'actions'
  | 'transfers';
type ReplayWindow = '5' | '10' | '20' | 'all';
type ReplayRoundWindow = '1' | '3' | '5' | 'all';

const replayFilters: ReplayFilter[] = [
  'all',
  'treasury',
  'market',
  'messages',
  'actions',
  'transfers',
];

function matchesFilter(
  filter: ReplayFilter,
  event: GameReplayRecord['events'][number],
) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'treasury') {
    return (
      event.type === 'custody_placement' ||
      event.type === 'custody_redemption' ||
      event.type === 'custody_accrual'
    );
  }

  if (filter === 'messages') {
    return event.type === 'message';
  }

  if (filter === 'actions') {
    return event.type === 'action';
  }

  if (filter === 'market') {
    return (
      event.type === 'market_opportunity_listed' ||
      event.type === 'market_position_opened' ||
      event.type === 'market_position_settled' ||
      event.type === 'market_opportunity_resolved'
    );
  }

  return (
    event.type === 'transfer' ||
    event.type === 'deposit' ||
    event.type === 'withdrawal'
  );
}

export function AuditTrailCard({
  replay,
  selectedRound,
  isFetching,
  isTurnFlowInProgress,
  inProgressLabel,
  latestRunSummary,
}: AuditTrailCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ReplayFilter>('all');
  const [activeWindow, setActiveWindow] = useState<ReplayWindow>('all');
  const [activeRoundWindow, setActiveRoundWindow] =
    useState<ReplayRoundWindow>('all');
  const [animatedEventIds, setAnimatedEventIds] = useState<string[]>([]);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const previousVisibleEventIds = useRef<string[]>([]);

  const matchingEvents =
    replay?.events.filter((event) => matchesFilter(activeFilter, event)) ?? [];
  const latestRoundNumber = matchingEvents.reduce(
    (latestRound, event) => Math.max(latestRound, event.roundNumber ?? 0),
    selectedRound ?? 0,
  );
  const roundFilteredEvents =
    activeRoundWindow === 'all'
      ? matchingEvents
      : matchingEvents.filter((event) => {
          const roundNumber = event.roundNumber ?? 0;

          return (
            roundNumber >=
            latestRoundNumber - Number.parseInt(activeRoundWindow, 10) + 1
          );
        });
  const visibleEvents =
    activeWindow === 'all'
      ? roundFilteredEvents
      : roundFilteredEvents.slice(-Number.parseInt(activeWindow, 10));
  const eventsByRound = visibleEvents.reduce<
    Array<{
      roundNumber: number;
      events: typeof visibleEvents;
    }>
  >((groups, event) => {
    const roundNumber = event.roundNumber ?? selectedRound ?? 0;
    const existingGroup = groups.find(
      (group) => group.roundNumber === roundNumber,
    );

    if (existingGroup) {
      existingGroup.events.push(event);
      return groups;
    }

    groups.push({ roundNumber, events: [event] });
    return groups;
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      previousVisibleEventIds.current = visibleEvents.map((event) => event.id);
      return;
    }

    const previousIds = new Set(previousVisibleEventIds.current);
    const appendedEventIds = visibleEvents
      .map((event) => event.id)
      .filter((eventId) => !previousIds.has(eventId));

    previousVisibleEventIds.current = visibleEvents.map((event) => event.id);

    if (appendedEventIds.length === 0) {
      return;
    }

    setAnimatedEventIds(appendedEventIds);
    timelineScrollRef.current?.scrollTo({
      top: timelineScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });

    const timer = window.setTimeout(() => {
      setAnimatedEventIds((current) =>
        current.filter((eventId) => !appendedEventIds.includes(eventId)),
      );
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isExpanded, visibleEvents]);

  return (
    <CardShell className="replay-panel">
      <CardHeader
        kicker="Replay"
        title="Audit Trail"
        actions={
          <>
            {replay ? (
              <span className="status-chip muted">
                {visibleEvents.length} / {replay.events.length} events
              </span>
            ) : null}
            <CardCollapseButton
              isExpanded={isExpanded}
              expandLabel="Maximise audit trail"
              collapseLabel="Minimise audit trail"
              onToggle={() => setIsExpanded((current) => !current)}
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
              {replayFilters.map((filter) => (
                <button
                  key={filter}
                  className={
                    filter === activeFilter
                      ? 'filter-chip active'
                      : 'filter-chip'
                  }
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
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
                <option value="5">Last 5</option>
                <option value="10">Last 10</option>
                <option value="20">Last 20</option>
                <option value="all">All</option>
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
                <option value="1">Last 1 round</option>
                <option value="3">Last 3 rounds</option>
                <option value="5">Last 5 rounds</option>
                <option value="all">All rounds</option>
              </select>
            </label>
          </div>

          {isFetching ? <p>Loading replay...</p> : null}

          <div ref={timelineScrollRef} className="timeline-scroll">
            {replay ? (
              visibleEvents.length > 0 ? (
                <div className="timeline">
                  {eventsByRound.map((group) => (
                    <section key={group.roundNumber} className="round-group">
                      <div className="round-divider">
                        <span>Round {group.roundNumber}</span>
                        <strong>{group.events.length} event(s)</strong>
                      </div>

                      {group.events.map((event) => {
                        const eventDetail = getReplayEventDetail(event);
                        const isMarketOpportunityEvent =
                          event.type === 'market_opportunity_listed' ||
                          event.type === 'market_opportunity_resolved';

                        return (
                          <article
                            key={event.id}
                            className={
                              animatedEventIds.includes(event.id)
                                ? `timeline-event${isMarketOpportunityEvent ? ' market-opportunity-event' : ''} timeline-event-enter`
                                : `timeline-event${isMarketOpportunityEvent ? ' market-opportunity-event' : ''}`
                            }
                          >
                            <div className={`event-badge event-${event.type}`}>
                              {event.type.replace(/_/gu, ' ')}
                            </div>
                            <div className="event-content">
                              <div className="event-topline">
                                <strong>{getReplayEventLabel(event)}</strong>
                                <span>{formatTimestamp(event.createdAt)}</span>
                              </div>
                              {eventDetail && !isMarketOpportunityEvent ? (
                                <p className="event-detail">{eventDetail}</p>
                              ) : null}
                              {event.type === 'market_opportunity_listed' ? (
                                <dl className="event-meta-grid">
                                  <div>
                                    <dt>Risk</dt>
                                    <dd>{event.opportunityRiskLevel}</dd>
                                  </div>
                                  <div>
                                    <dt>Window</dt>
                                    <dd>
                                      R{event.listedRound} to R
                                      {event.settlementRound}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Commitment</dt>
                                    <dd>
                                      {event.minCommitment &&
                                      event.maxCommitment
                                        ? `${formatCurrency(event.minCommitment)} - ${formatCurrency(event.maxCommitment)}`
                                        : 'N/A'}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Range</dt>
                                    <dd>
                                      {typeof event.worstCaseReturnBps ===
                                        'number' &&
                                      typeof event.bestCaseReturnBps ===
                                        'number'
                                        ? `${formatBasisPoints(event.worstCaseReturnBps)} to ${formatBasisPoints(event.bestCaseReturnBps)}`
                                        : 'N/A'}
                                    </dd>
                                  </div>
                                </dl>
                              ) : null}
                              {event.type === 'market_opportunity_resolved' ? (
                                <>
                                  <dl className="event-meta-grid">
                                    <div>
                                      <dt>Participants</dt>
                                      <dd>{event.participantCount ?? 0}</dd>
                                    </div>
                                    <div>
                                      <dt>Total principal</dt>
                                      <dd>
                                        {event.totalPrincipal
                                          ? formatCurrency(event.totalPrincipal)
                                          : '0.00'}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt>Net PnL</dt>
                                      <dd>
                                        {event.totalProfitOrLoss
                                          ? formatSignedCurrency(
                                              event.totalProfitOrLoss,
                                            )
                                          : '0.00'}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt>Window</dt>
                                      <dd>
                                        R{event.listedRound} to R
                                        {event.settlementRound}
                                      </dd>
                                    </div>
                                  </dl>
                                  <div className="event-participants">
                                    {event.participantSettlements?.length ? (
                                      event.participantSettlements.map(
                                        (participant) => (
                                          <div
                                            key={`${event.id}-${participant.ownerAgentId}`}
                                            className="event-participant-row"
                                          >
                                            <strong>
                                              {participant.ownerAgentName}
                                            </strong>
                                            <span>
                                              Principal{' '}
                                              {formatCurrency(
                                                participant.principal,
                                              )}
                                            </span>
                                            <span>
                                              PnL{' '}
                                              {formatSignedCurrency(
                                                participant.profitOrLoss,
                                              )}
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
                              <p className="event-meta">
                                Round {event.roundNumber ?? selectedRound ?? 0}
                                {event.turnNumber
                                  ? ` / Turn ${event.turnNumber}`
                                  : ''}
                              </p>
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
