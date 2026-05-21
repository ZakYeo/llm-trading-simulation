import { useState } from 'react';

import type { MarketVisibilityViewData } from '../features/session-overview/model/session-overview';

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
          icon="monitoring"
          iconTone="tertiary"
          actions={
            <span className="status-chip muted">
              {market.opportunityPositionSummaryLabel}
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
            <p className="summary-copy">{market.featuredOpportunitySummary}</p>
            {market.opportunityTitles ? (
              <p className="summary-copy">{market.opportunityTitles}</p>
            ) : null}
          </article>

          <article className="summary-callout">
            <span>Trader exposure</span>
            <strong>{market.featuredPositionSummary}</strong>
            <p className="summary-copy">{market.featuredPositionDetail}</p>
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
        icon="monitoring"
        iconTone="tertiary"
        actions={
          <>
            {market ? (
              <span className="status-chip muted">
                {market.opportunityPositionSummaryLabel}
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
                  <p className="panel-kicker">Current opportunities</p>
                  <h3>Current Opportunities</h3>
                </div>
                <span className="status-chip muted">
                  {market.currentRoundLabel}
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
                          {opportunity.riskLabel}
                        </span>
                      </div>

                      <dl className="market-detail-grid">
                        <div>
                          <dt>Min commitment</dt>
                          <dd>{opportunity.minCommitmentLabel}</dd>
                        </div>
                        <div>
                          <dt>Max commitment</dt>
                          <dd>{opportunity.maxCommitmentLabel}</dd>
                        </div>
                        <div>
                          <dt>Expected return</dt>
                          <dd>{opportunity.estimatedNetReturnLabel}</dd>
                        </div>
                        <div>
                          <dt>Range</dt>
                          <dd>{opportunity.returnRangeLabel}</dd>
                        </div>
                        <div>
                          <dt>Signal quality</dt>
                          <dd>{opportunity.signalQuality}</dd>
                        </div>
                        <div>
                          <dt>Hold</dt>
                          <dd>{opportunity.holdingPeriodLabel}</dd>
                        </div>
                        <div>
                          <dt>Listed</dt>
                          <dd>{opportunity.listedRoundLabel}</dd>
                        </div>
                        <div>
                          <dt>Settlement</dt>
                          <dd>{opportunity.settlementRoundLabel}</dd>
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
                  <p className="panel-kicker">Active positions</p>
                  <h3>Active Positions</h3>
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
                          <dd>{position.principalLabel}</dd>
                        </div>
                        <div>
                          <dt>Entry round</dt>
                          <dd>{position.entryRoundLabel}</dd>
                        </div>
                        <div>
                          <dt>Settlement round</dt>
                          <dd>{position.settlementRoundLabel}</dd>
                        </div>
                        <div>
                          <dt>Current context</dt>
                          <dd>{market.currentRoundLabel}</dd>
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
                  No Open or Settled positions in {market.currentRoundLabel}
                  <span className="visually-hidden">
                    No market positions opened yet.
                  </span>
                </p>
              )}
            </section>
          </div>
        )}
      </CardBody>
    </CardShell>
  );
}
