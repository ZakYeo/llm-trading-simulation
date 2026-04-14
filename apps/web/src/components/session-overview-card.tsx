import { useState } from 'react';

import type { GameSessionRecord } from '../lib/api';

import { CardCollapseButton, CardHeader, CardShell } from './card-shell';

interface SessionOverviewCardProps {
  selectedSession?: GameSessionRecord;
  isFetching: boolean;
}

export function SessionOverviewCard({
  selectedSession,
  isFetching,
}: SessionOverviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <CardShell>
      <CardHeader
        kicker="Live State"
        title="Session Workspace"
        actions={
          <>
            {selectedSession ? (
              <span className="status-chip muted">
                {selectedSession.bankerCustodyPositions.length} custody position
                {selectedSession.bankerCustodyPositions.length === 1 ? '' : 's'}
              </span>
            ) : null}
            <CardCollapseButton
              isExpanded={isExpanded}
              expandLabel="Maximise live state"
              collapseLabel="Minimise live state"
              onToggle={() => setIsExpanded((current) => !current)}
            />
          </>
        }
      />

      {isFetching ? <p>Loading session...</p> : null}

      {!selectedSession && isExpanded ? (
        <p className="empty-copy">
          Create a new session or connect to a saved session to inspect live
          workspace state.
        </p>
      ) : null}

      {selectedSession && isExpanded ? (
        <div className="overview-grid">
          <article className="overview-card">
            <span>Session name</span>
            <strong>{selectedSession.name}</strong>
          </article>
          <article className="overview-card">
            <span>Status</span>
            <strong>{selectedSession.status}</strong>
          </article>
          <article className="overview-card">
            <span>Current round</span>
            <strong>{selectedSession.currentRound}</strong>
          </article>
          <article className="overview-card">
            <span>Session id</span>
            <strong className="mono">{selectedSession.id}</strong>
          </article>
        </div>
      ) : null}
    </CardShell>
  );
}
