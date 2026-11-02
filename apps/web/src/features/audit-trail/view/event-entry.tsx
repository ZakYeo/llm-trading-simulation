import type { AuditTrailTimelineEvent } from '../model/audit-trail';

export function EventEntry({
  event,
  onInspect,
  compact = false,
}: {
  event: AuditTrailTimelineEvent;
  onInspect?: (event: AuditTrailTimelineEvent) => void;
  compact?: boolean;
}) {
  return (
    <article
      className={`timeline-event ${event.type === 'message' ? 'journal-message' : 'journal-action'}`}
    >
      <div className="event-topline">
        <span className="event-badge">{event.badgeLabel}</span>
        <time dateTime={event.createdAt}>{event.timestampLabel}</time>
      </div>
      {event.type === 'message' ? (
        <>
          <div className="message-attribution">
            <strong>{event.senderAgentName ?? 'Agent'}</strong>
            <span>
              {event.visibility === 'private'
                ? `Private → ${event.recipientAgentName ?? 'recipient'}`
                : 'To everyone'}
            </span>
          </div>
          <p className="event-detail">
            {event.detail}
            {event.isStreaming && (
              <span
                className="streaming-cursor"
                aria-label={
                  event.streamingStatus === 'streaming'
                    ? 'Message typing in progress'
                    : 'Live message persisted'
                }
              >
                {' '}
                ▍
              </span>
            )}
          </p>
        </>
      ) : (
        <>
          <p className="event-label">{event.label}</p>
          {event.detail && (
            <p className="event-detail action-detail">{event.detail}</p>
          )}
        </>
      )}
      {!compact && event.listedMeta.length > 0 && (
        <dl className="event-meta-grid">
          {event.listedMeta.map((meta) => (
            <div key={meta.label}>
              <dt>{meta.label}</dt>
              <dd>{meta.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {!compact && event.resolvedMeta.length > 0 && (
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
              event.participantRows.map((row) => (
                <div key={row.key} className="event-participant-row">
                  <strong>{row.ownerAgentName}</strong>
                  <span>Principal {row.principalLabel}</span>
                  <span>PnL {row.profitOrLossLabel}</span>
                </div>
              ))
            ) : (
              <p className="empty-copy">No traders bought this opportunity.</p>
            )}
          </div>
        </>
      )}
      <div className="event-bottom">
        <span className="event-meta">{event.roundLabel}</span>
        {onInspect && (
          <button
            type="button"
            className="text-button"
            aria-label={`Inspect ${event.badgeLabel}`}
            onClick={() => onInspect(event)}
          >
            Inspect ↗
          </button>
        )}
      </div>
    </article>
  );
}
