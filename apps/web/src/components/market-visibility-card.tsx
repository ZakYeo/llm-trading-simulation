import { useState } from 'react';

import type { GameSessionRecord } from '../lib/api';
import { formatBasisPoints, formatCurrency } from '../lib/formatters';

import {
  CardBody,
  CardCollapseButton,
  CardHeader,
  CardShell,
} from './card-shell';

interface MarketVisibilityCardProps {
  selectedSession?: GameSessionRecord;
  variant?: 'default' | 'compact';
}

function getPositionStatusLabel(
  currentRound: number,
  settlementRound: number,
): 'Open' | 'Settled' {
  return settlementRound <= currentRound ? 'Settled' : 'Open';
}

export function MarketVisibilityCard({
  selectedSession,
  variant = 'default',
}: MarketVisibilityCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (selectedSession && variant === 'compact') {
    const featuredOpportunity = selectedSession.marketOpportunities[0];
    const opportunityTitles = selectedSession.marketOpportunities
      .map((opportunity) => opportunity.title)
      .join(' · ');
    const openPositions = selectedSession.marketPositions.filter(
      (position) =>
        getPositionStatusLabel(
          selectedSession.currentRound,
          position.settlementRound,
        ) === 'Open',
    );
    const settledPositions = selectedSession.marketPositions.filter(
      (position) =>
        getPositionStatusLabel(
          selectedSession.currentRound,
          position.settlementRound,
        ) === 'Settled',
    );
    const firstOpenPosition = openPositions[0];
    const featuredPosition = firstOpenPosition ?? settledPositions[0];
    const featuredPositionOwner = featuredPosition
      ? selectedSession.agents.find(
          (agent) => agent.id === featuredPosition.ownerAgentId,
        )
      : undefined;
    const featuredPositionStatus = featuredPosition
      ? getPositionStatusLabel(
          selectedSession.currentRound,
          featuredPosition.settlementRound,
        )
      : null;

    return (
      <CardShell className="market-shell summary-shell">
        <CardHeader
          kicker="Market"
          title="Market Visibility"
          compact
          actions={
            <span className="status-chip muted">
              {selectedSession.marketOpportunities.length} opportunit
              {selectedSession.marketOpportunities.length === 1 ? 'y' : 'ies'}
              {' / '}
              {selectedSession.marketPositions.length} position
              {selectedSession.marketPositions.length === 1 ? '' : 's'}
            </span>
          }
        />

        <div className="summary-stat-grid">
          <article className="treasury-stat-card">
            <span>Opportunities</span>
            <strong>{selectedSession.marketOpportunities.length}</strong>
          </article>
          <article className="treasury-stat-card">
            <span>Open positions</span>
            <strong>{openPositions.length}</strong>
          </article>
          <article className="treasury-stat-card">
            <span>Round</span>
            <strong>{selectedSession.currentRound}</strong>
          </article>
        </div>

        <div className="summary-stack">
          <article className="summary-callout">
            <span>Featured opportunity</span>
            <strong>{featuredOpportunity?.title ?? 'No live listings'}</strong>
            <p className="summary-copy">
              {featuredOpportunity
                ? `${formatCurrency(featuredOpportunity.minCommitment)} to ${formatCurrency(featuredOpportunity.maxCommitment)} · ${formatBasisPoints(featuredOpportunity.estimatedNetReturnBps)} · ${featuredOpportunity.signalQuality} signal · ${featuredOpportunity.holdingPeriodRounds} round hold`
                : 'No live market opportunities are available in this session.'}
            </p>
            {opportunityTitles ? (
              <p className="summary-copy">{opportunityTitles}</p>
            ) : null}
          </article>

          <article className="summary-callout">
            <span>Trader exposure</span>
            <strong>
              {featuredPosition
                ? `${featuredPosition.opportunityTitle} · ${formatCurrency(featuredPosition.principal)}`
                : 'No market positions opened yet.'}
            </strong>
            <p className="summary-copy">
              {featuredPosition
                ? `${featuredPositionOwner?.name ?? featuredPosition.ownerAgentId} · ${featuredPositionStatus} · Round ${featuredPosition.settlementRound}`
                : 'Exposure appears here once a trader opens a position.'}
            </p>
          </article>
        </div>
      </CardShell>
    );
  }

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

      <CardBody isExpanded={isExpanded}>
        {!selectedSession ? (
          <p className="empty-copy">
            Create a new session or connect to a saved session to inspect live
            market opportunities and trader positions.
          </p>
        ) : (
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
                            ? 'High risk'
                            : 'Low risk'}
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
                            {formatBasisPoints(
                              opportunity.estimatedNetReturnBps,
                            )}
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
                          <dt>Signal quality</dt>
                          <dd>{opportunity.signalQuality}</dd>
                        </div>
                        <div>
                          <dt>Hold</dt>
                          <dd>
                            {opportunity.holdingPeriodRounds} round
                            {opportunity.holdingPeriodRounds === 1 ? '' : 's'}
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
        )}
      </CardBody>
    </CardShell>
  );
}
