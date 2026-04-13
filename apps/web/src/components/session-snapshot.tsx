import { useState } from 'react';

import type { GameSessionRecord } from '../lib/api';
import { formatCurrency } from '../lib/formatters';

interface SessionSnapshotProps {
  selectedSessionId: string;
  selectedSession?: GameSessionRecord;
  isFetching: boolean;
}

export function SessionSnapshot({
  selectedSessionId,
  selectedSession,
  isFetching,
}: SessionSnapshotProps) {
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(true);
  const [isBalancesExpanded, setIsBalancesExpanded] = useState(true);
  const banker = selectedSession?.agents.find(
    (agent) => agent.role === 'banker',
  );
  const trader = selectedSession?.agents.find(
    (agent) => agent.role === 'trader',
  );
  const traderCustodyPosition =
    selectedSession && banker && trader
      ? selectedSession.bankerCustodyPositions.find(
          (position) =>
            position.bankerAgentId === banker.id &&
            position.ownerAgentId === trader.id,
        )
      : undefined;
  const totalCustodiedBalance =
    selectedSession?.bankerCustodyPositions.reduce(
      (total, position) => total + Number.parseFloat(position.totalBalance),
      0,
    ) ?? 0;
  const totalCustodiedInterest =
    selectedSession?.bankerCustodyPositions.reduce(
      (total, position) => total + Number.parseFloat(position.accruedInterest),
      0,
    ) ?? 0;
  const totalCustodiedPrincipal =
    selectedSession?.bankerCustodyPositions.reduce(
      (total, position) => total + Number.parseFloat(position.principal),
      0,
    ) ?? 0;

  return (
    <section className="workspace-panel">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Live State</p>
            <h2>Session Workspace</h2>
          </div>
          <div className="panel-header-actions">
            {selectedSession ? (
              <span className="status-chip muted">
                {selectedSession.bankerCustodyPositions.length} custody position
                {selectedSession.bankerCustodyPositions.length === 1 ? '' : 's'}
              </span>
            ) : null}
            <button
              className="icon-button"
              aria-label={
                isWorkspaceExpanded
                  ? 'Minimise live state'
                  : 'Maximise live state'
              }
              type="button"
              onClick={() => setIsWorkspaceExpanded((current) => !current)}
            >
              {isWorkspaceExpanded ? '−' : '+'}
            </button>
          </div>
        </div>

        {isFetching ? <p>Loading session...</p> : null}

        {!selectedSessionId ? (
          <p className="empty-copy">
            Start by creating a session or connecting to an existing one.
          </p>
        ) : null}

        {selectedSession && isWorkspaceExpanded ? (
          <div className="workspace-stack">
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

            <section>
              <div className="subsection-header">
                <div>
                  <p className="panel-kicker">Balances</p>
                  <h3>Agent Accounts</h3>
                </div>
                <button
                  className="icon-button"
                  aria-label={
                    isBalancesExpanded
                      ? 'Minimise balances'
                      : 'Maximise balances'
                  }
                  type="button"
                  onClick={() => setIsBalancesExpanded((current) => !current)}
                >
                  {isBalancesExpanded ? '−' : '+'}
                </button>
              </div>
              {isBalancesExpanded ? (
                <div className="agent-balance-grid">
                  {selectedSession.agents.map((agent) => (
                    <article key={agent.id} className="balance-card">
                      <header>
                        <strong>{agent.name}</strong>
                        <span>{agent.role}</span>
                      </header>
                      <dl>
                        <div>
                          <dt>Available</dt>
                          <dd>{formatCurrency(agent.availableBalance)}</dd>
                        </div>
                        <div>
                          <dt>Reserved</dt>
                          <dd>{formatCurrency(agent.reservedBalance)}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="treasury-shell">
              <div className="subsection-header">
                <div>
                  <p className="panel-kicker">Treasury</p>
                  <h3>Custody Overview</h3>
                </div>
                <span className="status-chip">Banker-led custody</span>
              </div>

              <div className="treasury-layout">
                <div className="treasury-column full-width">
                  <div className="treasury-summary-grid">
                    <article className="treasury-stat-card emphasis">
                      <span>Total custodied</span>
                      <strong>
                        {formatCurrency(totalCustodiedBalance.toFixed(4))}
                      </strong>
                    </article>
                    <article className="treasury-stat-card">
                      <span>Total principal</span>
                      <strong>
                        {formatCurrency(totalCustodiedPrincipal.toFixed(4))}
                      </strong>
                    </article>
                    <article className="treasury-stat-card">
                      <span>Accrued interest</span>
                      <strong>
                        {formatCurrency(totalCustodiedInterest.toFixed(4))}
                      </strong>
                    </article>
                    <article className="treasury-stat-card">
                      <span>Trader custody</span>
                      <strong>
                        {traderCustodyPosition
                          ? formatCurrency(traderCustodyPosition.totalBalance)
                          : formatCurrency('0.0000')}
                      </strong>
                    </article>
                  </div>

                  {traderCustodyPosition ? (
                    <div className="treasury-position-card">
                      <div>
                        <span>Trader principal with banker</span>
                        <strong>
                          {formatCurrency(traderCustodyPosition.principal)}
                        </strong>
                      </div>
                      <div>
                        <span>Trader accrued interest</span>
                        <strong>
                          {formatCurrency(
                            traderCustodyPosition.accruedInterest,
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Redeemable total</span>
                        <strong>
                          {formatCurrency(traderCustodyPosition.totalBalance)}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="empty-copy treasury-empty">
                      No trader funds are currently placed with the banker.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : selectedSession ? (
          <div className="collapsed-setup-copy workspace-collapsed-copy">
            <p>
              Live state is hidden. Expand it to inspect balances and treasury.
            </p>
          </div>
        ) : null}
      </section>
    </section>
  );
}
