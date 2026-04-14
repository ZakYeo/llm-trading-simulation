import { useState } from 'react';

import type { GameReplayRecord } from '../lib/api';
import {
  formatTimestamp,
  getReplayEventDetail,
  getReplayEventLabel,
} from '../lib/formatters';

import { CardCollapseButton, CardHeader, CardShell } from './card-shell';

interface AuditTrailCardProps {
  replay?: GameReplayRecord;
  selectedRound?: number;
  isFetching: boolean;
}

type ReplayFilter = 'all' | 'treasury' | 'messages' | 'actions' | 'transfers';
type ReplayWindow = '5' | '10' | '20' | 'all';
type ReplayRoundWindow = '1' | '3' | '5' | 'all';

const replayFilters: ReplayFilter[] = [
  'all',
  'treasury',
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
}: AuditTrailCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ReplayFilter>('all');
  const [activeWindow, setActiveWindow] = useState<ReplayWindow>('all');
  const [activeRoundWindow, setActiveRoundWindow] =
    useState<ReplayRoundWindow>('all');

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

      {isExpanded ? (
        <>
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

          {replay ? (
            visibleEvents.length > 0 ? (
              <div className="timeline-scroll">
                <div className="timeline">
                  {eventsByRound.map((group) => (
                    <section key={group.roundNumber} className="round-group">
                      <div className="round-divider">
                        <span>Round {group.roundNumber}</span>
                        <strong>{group.events.length} event(s)</strong>
                      </div>

                      {group.events.map((event) => {
                        const eventDetail = getReplayEventDetail(event);

                        return (
                          <article key={event.id} className="timeline-event">
                            <div className={`event-badge event-${event.type}`}>
                              {event.type.replace(/_/gu, ' ')}
                            </div>
                            <div className="event-content">
                              <div className="event-topline">
                                <strong>{getReplayEventLabel(event)}</strong>
                                <span>{formatTimestamp(event.createdAt)}</span>
                              </div>
                              {eventDetail ? (
                                <p className="event-detail">{eventDetail}</p>
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
              </div>
            ) : (
              <p className="empty-copy">
                No replay events match the current filter yet.
              </p>
            )
          ) : (
            <p className="empty-copy">
              Replay events will appear here after the selected session has
              activity.
            </p>
          )}
        </>
      ) : (
        <div className="collapsed-setup-copy">
          <p>Audit trail is hidden. Expand it to inspect replay history.</p>
        </div>
      )}
    </CardShell>
  );
}
