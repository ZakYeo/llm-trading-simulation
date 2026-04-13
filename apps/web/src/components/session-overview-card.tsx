import { useState } from 'react';

import type { GameSessionRecord } from '../lib/api';

import { CardCollapseButton, CardHeader, CardShell } from './card-shell';

interface SessionOverviewCardProps {
  selectedSessionId: string;
  selectedSession?: GameSessionRecord;
  isFetching: boolean;
}

export function SessionOverviewCard({
  selectedSessionId,
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
      {!selectedSessionId ? (
        <p className="empty-copy">
          Start by creating a session or connecting to an existing one.
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
      ) : selectedSession ? (
        <div className="collapsed-setup-copy workspace-collapsed-copy">
          <p>
            Live state is hidden. Expand it to inspect balances and treasury.
          </p>
        </div>
      ) : null}
    </CardShell>
  );
}
