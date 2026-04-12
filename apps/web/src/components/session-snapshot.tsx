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

  return (
    <section className="panel session-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">State</p>
          <h2>Session Snapshot</h2>
        </div>
        {selectedSession ? (
          <span className="status-chip muted">
            Round {selectedSession.currentRound}
          </span>
        ) : null}
      </div>

      {isFetching ? <p>Loading session...</p> : null}
      {!selectedSessionId ? (
        <p className="empty-copy">
          Create a session or paste an existing session id to inspect live
          state.
        </p>
      ) : null}
      {selectedSession ? (
        <>
          <div className="session-meta">
            <div>
              <span>Name</span>
              <strong>{selectedSession.name}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{selectedSession.status}</strong>
            </div>
            <div>
              <span>Session id</span>
              <strong className="mono">{selectedSession.id}</strong>
            </div>
          </div>

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

          <section className="treasury-panel">
            <div className="treasury-header">
              <div>
                <p className="panel-kicker">Treasury</p>
                <h3>Custody Overview</h3>
              </div>
              <span className="status-chip muted">
                {selectedSession.bankerCustodyPositions.length} position
                {selectedSession.bankerCustodyPositions.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="treasury-summary-grid">
              <article className="treasury-stat-card">
                <span>Total custodied</span>
                <strong>
                  {formatCurrency(totalCustodiedBalance.toFixed(4))}
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
                    {formatCurrency(traderCustodyPosition.accruedInterest)}
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
              <p className="empty-copy">
                No trader funds are currently placed with the banker.
              </p>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
