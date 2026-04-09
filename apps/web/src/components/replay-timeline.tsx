import type { GameReplayRecord } from '../lib/api';
import {
  formatTimestamp,
  getReplayEventDetail,
  getReplayEventLabel,
} from '../lib/formatters';

interface ReplayTimelineProps {
  replay?: GameReplayRecord;
  selectedRound?: number;
  isFetching: boolean;
}

export function ReplayTimeline({
  replay,
  selectedRound,
  isFetching,
}: ReplayTimelineProps) {
  return (
    <section className="panel replay-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Replay</p>
          <h2>Event Timeline</h2>
        </div>
        {replay ? (
          <span className="status-chip muted">
            {replay.events.length} events
          </span>
        ) : null}
      </div>

      {isFetching ? <p>Loading replay...</p> : null}
      {replay ? (
        <div className="timeline">
          {replay.events.map((event) => {
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
                    {event.turnNumber ? ` / Turn ${event.turnNumber}` : ''}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-copy">
          Replay events will appear here after the selected session has
          activity.
        </p>
      )}
    </section>
  );
}
