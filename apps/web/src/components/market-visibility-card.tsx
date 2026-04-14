import { useState } from 'react';

import type { GameSessionRecord } from '../lib/api';
import { formatBasisPoints, formatCurrency } from '../lib/formatters';

import { CardCollapseButton, CardHeader, CardShell } from './card-shell';

interface MarketVisibilityCardProps {
  selectedSession?: GameSessionRecord;
}

function getPositionStatusLabel(
  currentRound: number,
  settlementRound: number,
): 'Open' | 'Settled' {
  return settlementRound <= currentRound ? 'Settled' : 'Open';
}

export function MarketVisibilityCard({
  selectedSession,
}: MarketVisibilityCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <CardShell className="market-shell">
      <CardHeader
        kicker="Market"
        title="Market Visibility"
        actions={
          <>
            {selectedSession ? (
              <span className="status-chip muted">
                {selectedSession.marketOpportunities.length} opportunit
                {selectedSession.marketOpportunities.length === 1 ? 'y' : 'ies'}
                {' / '}
                {selectedSession.marketPositions.length} position
                {selectedSession.marketPositions.length === 1 ? '' : 's'}
              </span>
            ) : null}
            <CardCollapseButton
              isExpanded={isExpanded}
              expandLabel="Maximise market visibility"
              collapseLabel="Minimise market visibility"
              onToggle={() => setIsExpanded((current) => !current)}
            />
          </>
        }
      />

      {selectedSession && isExpanded ? (
        <div className="market-layout">
          <section className="market-section">
            <div className="subsection-header">
              <div>
                <p className="panel-kicker">Opportunities</p>
                <h3>Current listings</h3>
              </div>
              <span className="status-chip muted">
                Round {selectedSession.currentRound}
              </span>
            </div>

            {selectedSession.marketOpportunities.length > 0 ? (
              <div className="market-opportunity-grid">
                {selectedSession.marketOpportunities.map((opportunity) => (
                  <article
                    key={opportunity.id}
                    className="market-opportunity-card"
                  >
                    <div className="market-card-topline">
                      <div>
                        <strong>{opportunity.title}</strong>
                        <p>{opportunity.summary}</p>
                      </div>
                      <span
                        className={
                          opportunity.riskLevel === 'high'
                            ? 'status-chip risk-high'
                            : 'status-chip risk-low'
                        }
                      >
                        {opportunity.riskLevel === 'high'
                          ? 'Risky'
                          : 'Bad / Low Edge'}
                      </span>
                    </div>

                    <dl className="market-detail-grid">
                      <div>
                        <dt>Min commitment</dt>
                        <dd>{formatCurrency(opportunity.minCommitment)}</dd>
                      </div>
                      <div>
                        <dt>Max commitment</dt>
                        <dd>{formatCurrency(opportunity.maxCommitment)}</dd>
                      </div>
                      <div>
                        <dt>Expected return</dt>
                        <dd>
                          {formatBasisPoints(opportunity.estimatedNetReturnBps)}
                        </dd>
                      </div>
                      <div>
                        <dt>Range</dt>
                        <dd>
                          {formatBasisPoints(opportunity.worstCaseReturnBps)}
                          {' to '}
                          {formatBasisPoints(opportunity.bestCaseReturnBps)}
                        </dd>
                      </div>
                      <div>
                        <dt>Listed</dt>
                        <dd>Round {opportunity.listedRound}</dd>
                      </div>
                      <div>
                        <dt>Settlement</dt>
                        <dd>Round {opportunity.settlementRound}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-copy market-empty">
                No live market opportunities are available in this session.
              </p>
            )}
          </section>

          <section className="market-section">
            <div className="subsection-header">
              <div>
                <p className="panel-kicker">Positions</p>
                <h3>Trader exposure</h3>
              </div>
            </div>

            {selectedSession.marketPositions.length > 0 ? (
              <div className="market-position-grid">
                {selectedSession.marketPositions.map((position) => {
                  const ownerAgent = selectedSession.agents.find(
                    (agent) => agent.id === position.ownerAgentId,
                  );
                  const statusLabel = getPositionStatusLabel(
                    selectedSession.currentRound,
                    position.settlementRound,
                  );

                  return (
                    <article
                      key={`${position.ownerAgentId}-${position.opportunityId}-${position.entryRound}`}
                      className="market-position-card"
                    >
                      <div className="market-card-topline">
                        <div>
                          <strong>{position.opportunityTitle}</strong>
                          <p>{ownerAgent?.name ?? position.ownerAgentId}</p>
                        </div>
                        <span
                          className={
                            statusLabel === 'Settled'
                              ? 'status-chip position-settled'
                              : 'status-chip position-open'
                          }
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <dl className="market-detail-grid">
                        <div>
                          <dt>Owner</dt>
                          <dd>{ownerAgent?.name ?? position.ownerAgentId}</dd>
                        </div>
                        <div>
                          <dt>Principal</dt>
                          <dd>{formatCurrency(position.principal)}</dd>
                        </div>
                        <div>
                          <dt>Entry round</dt>
                          <dd>Round {position.entryRound}</dd>
                        </div>
                        <div>
                          <dt>Settlement round</dt>
                          <dd>Round {position.settlementRound}</dd>
                        </div>
                        <div>
                          <dt>Current context</dt>
                          <dd>Round {selectedSession.currentRound}</dd>
                        </div>
                        <div>
                          <dt>Realized value</dt>
                          <dd>Not exposed in session payload</dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="empty-copy market-empty">
                No market positions opened yet.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </CardShell>
  );
}
