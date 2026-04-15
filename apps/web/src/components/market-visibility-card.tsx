import { useState } from 'react';

import type { MarketVisibilityViewData } from '../features/session-overview/model/session-overview';
import { formatBasisPoints, formatCurrency } from '../lib/formatters';

import {
  CardBody,
  CardCollapseButton,
  CardHeader,
  CardShell,
} from './card-shell';

interface MarketVisibilityCardProps {
  market?: MarketVisibilityViewData;
  variant?: 'default' | 'compact';
}

export function MarketVisibilityCard({
  market,
  variant = 'default',
}: MarketVisibilityCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (market && variant === 'compact') {
    return (
      <CardShell className="market-shell summary-shell">
        <CardHeader
          kicker="Market"
          title="Market Visibility"
          compact
          actions={
            <span className="status-chip muted">
              {market.opportunityCount} opportunit
              {market.opportunityCount === 1 ? 'y' : 'ies'}
              {' / '}
              {market.positionCount} position
              {market.positionCount === 1 ? '' : 's'}
            </span>
          }
        />

        <div className="summary-stat-grid">
          <article className="treasury-stat-card">
            <span>Opportunities</span>
            <strong>{market.opportunityCount}</strong>
          </article>
          <article className="treasury-stat-card">
            <span>Open positions</span>
            <strong>{market.openPositionCount}</strong>
          </article>
          <article className="treasury-stat-card">
            <span>Round</span>
            <strong>{market.currentRound}</strong>
          </article>
        </div>

        <div className="summary-stack">
          <article className="summary-callout">
            <span>Featured opportunity</span>
            <strong>
              {market.featuredOpportunity?.title ?? 'No live listings'}
            </strong>
            <p className="summary-copy">
              {market.featuredOpportunity
                ? `${formatCurrency(market.featuredOpportunity.minCommitment)} to ${formatCurrency(market.featuredOpportunity.maxCommitment)} · ${formatBasisPoints(market.featuredOpportunity.estimatedNetReturnBps)} · ${market.featuredOpportunity.signalQuality} signal · ${market.featuredOpportunity.holdingPeriodRounds} round hold`
                : 'No live market opportunities are available in this session.'}
            </p>
            {market.opportunityTitles ? (
              <p className="summary-copy">{market.opportunityTitles}</p>
            ) : null}
          </article>

          <article className="summary-callout">
            <span>Trader exposure</span>
            <strong>
              {market.featuredPosition
                ? `${market.featuredPosition.opportunityTitle} · ${formatCurrency(market.featuredPosition.principal)}`
                : 'No market positions opened yet.'}
            </strong>
            <p className="summary-copy">
              {market.featuredPosition
                ? `${market.featuredPosition.ownerName} · ${market.featuredPosition.statusLabel} · Round ${market.featuredPosition.settlementRound}`
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
            {market ? (
              <span className="status-chip muted">
                {market.opportunityCount} opportunit
                {market.opportunityCount === 1 ? 'y' : 'ies'}
                {' / '}
                {market.positionCount} position
                {market.positionCount === 1 ? '' : 's'}
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
        {!market ? (
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
                  Round {market.currentRound}
                </span>
              </div>

              {market.opportunities.length > 0 ? (
                <div className="market-opportunity-grid">
                  {market.opportunities.map((opportunity) => (
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

              {market.positions.length > 0 ? (
                <div className="market-position-grid">
                  {market.positions.map((position) => (
                    <article
                      key={position.key}
                      className="market-position-card"
                    >
                      <div className="market-card-topline">
                        <div>
                          <strong>{position.opportunityTitle}</strong>
                          <p>{position.ownerName}</p>
                        </div>
                        <span
                          className={
                            position.statusLabel === 'Settled'
                              ? 'status-chip position-settled'
                              : 'status-chip position-open'
                          }
                        >
                          {position.statusLabel}
                        </span>
                      </div>

                      <dl className="market-detail-grid">
                        <div>
                          <dt>Owner</dt>
                          <dd>{position.ownerName}</dd>
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
                          <dd>Round {market.currentRound}</dd>
                        </div>
                        <div>
                          <dt>Realized value</dt>
                          <dd>Not exposed in session payload</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
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
