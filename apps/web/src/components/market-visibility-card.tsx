import type {
  MarketVisibilityViewData,
  MarketOpportunityViewData,
  MarketPositionViewData,
} from '../features/session-overview/model/session-overview';

export function MarketVisibilityCard({
  market,
  onInspectOpportunity,
  onInspectPosition,
}: {
  market?: MarketVisibilityViewData;
  onInspectOpportunity?: (opportunity: MarketOpportunityViewData) => void;
  onInspectPosition?: (position: MarketPositionViewData) => void;
}) {
  if (!market)
    return (
      <p className="empty-copy">Connect to a session to inspect its market.</p>
    );
  return (
    <div className="market-shell">
      <section className="ledger-section">
        <header className="section-heading">
          <h2>Current opportunities</h2>
          <span className="field-note">
            {market.opportunityPositionSummaryLabel}
          </span>
        </header>
        {market.opportunities.length ? (
          <div className="market-card-list">
            {market.opportunities.map((opportunity) => (
              <article className="market-card" key={opportunity.id}>
                <header className="section-heading">
                  <h3>{opportunity.title}</h3>
                  <span
                    className={
                      opportunity.riskLevel === 'high'
                        ? 'risk-high'
                        : 'risk-low'
                    }
                  >
                    {opportunity.riskLabel}
                  </span>
                </header>
                <p className="table-summary">{opportunity.summary}</p>
                <dl className="market-terms">
                  <div>
                    <dt>Min–max commitment</dt>
                    <dd>
                      {opportunity.minCommitmentLabel}–
                      {opportunity.maxCommitmentLabel} SIM
                    </dd>
                  </div>
                  <div>
                    <dt>Expected return</dt>
                    <dd>{opportunity.estimatedNetReturnLabel}</dd>
                  </div>
                  <div>
                    <dt>Return range</dt>
                    <dd>{opportunity.returnRangeLabel}</dd>
                  </div>
                  <div>
                    <dt>Signal quality</dt>
                    <dd>{opportunity.signalQualityLabel}</dd>
                  </div>
                  <div>
                    <dt>Holding period</dt>
                    <dd>{opportunity.holdingPeriodLabel}</dd>
                  </div>
                  <div>
                    <dt>Listed / settlement</dt>
                    <dd>
                      {opportunity.listedRoundLabel} /{' '}
                      {opportunity.settlementRoundLabel}
                    </dd>
                  </div>
                </dl>
                <button
                  className="text-button"
                  type="button"
                  aria-label={`Inspect opportunity ${opportunity.title}`}
                  onClick={() => onInspectOpportunity?.(opportunity)}
                >
                  Full terms ↗
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-copy">
            No live market opportunities are available in this session.
          </p>
        )}
      </section>
      <section className="ledger-section">
        <header className="section-heading">
          <h2>Trader exposure</h2>
          <span className="field-note">Open and settled positions</span>
        </header>
        {market.positions.length ? (
          <div className="market-card-list">
            {market.positions.map((position) => (
              <article className="market-card" key={position.key}>
                <header className="section-heading">
                  <h3>{position.opportunityTitle}</h3>
                  <span
                    className={
                      position.statusLabel === 'Open'
                        ? 'position-open'
                        : 'position-settled'
                    }
                  >
                    {position.statusLabel}
                  </span>
                </header>
                <dl className="market-terms">
                  <div>
                    <dt>Owner</dt>
                    <dd>{position.ownerName}</dd>
                  </div>
                  <div>
                    <dt>Principal</dt>
                    <dd>{position.principalLabel} SIM</dd>
                  </div>
                  <div>
                    <dt>Entry</dt>
                    <dd>{position.entryRoundLabel}</dd>
                  </div>
                  <div>
                    <dt>Settlement</dt>
                    <dd>{position.settlementRoundLabel}</dd>
                  </div>
                </dl>
                <p className="field-note">
                  Realized value unavailable in session data.
                </p>
                <button
                  className="text-button"
                  type="button"
                  aria-label={`Inspect position ${position.opportunityTitle} for ${position.ownerName}`}
                  onClick={() => onInspectPosition?.(position)}
                >
                  Details ↗
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-copy">No market positions opened yet.</p>
        )}
      </section>
    </div>
  );
}
