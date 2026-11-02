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
          <table className="ledger-table">
            <caption className="sr-only">
              Current market opportunities in {market.currentRoundLabel}
            </caption>
            <thead>
              <tr>
                <th scope="col">Opportunity</th>
                <th scope="col">Risk</th>
                <th scope="col">Expected return</th>
                <th scope="col">Settlement</th>
                <th scope="col">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {market.opportunities.map((opportunity) => (
                <tr key={opportunity.id}>
                  <th scope="row">
                    <strong>{opportunity.title}</strong>
                    <p className="table-summary">{opportunity.summary}</p>
                  </th>
                  <td>
                    <span className="cell-label" aria-hidden="true">
                      Risk
                    </span>
                    <span
                      className={
                        opportunity.riskLevel === 'high'
                          ? 'risk-high'
                          : 'risk-low'
                      }
                    >
                      {opportunity.riskLabel}
                    </span>
                  </td>
                  <td>
                    <span className="cell-label" aria-hidden="true">
                      Expected return
                    </span>
                    <span>{opportunity.estimatedNetReturnLabel}</span>
                  </td>
                  <td>
                    <span className="cell-label" aria-hidden="true">
                      Settlement
                    </span>
                    <span>{opportunity.settlementRoundLabel}</span>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      type="button"
                      aria-label={`Inspect opportunity ${opportunity.title}`}
                      onClick={() => onInspectOpportunity?.(opportunity)}
                    >
                      Full terms ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <table className="ledger-table positions-table">
            <caption className="sr-only">
              Market positions in {market.currentRoundLabel}
            </caption>
            <thead>
              <tr>
                <th scope="col">Position / owner</th>
                <th scope="col">Principal · SIM</th>
                <th scope="col">Entry</th>
                <th scope="col">Settlement</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {market.positions.map((position) => (
                <tr key={position.key}>
                  <th scope="row">
                    <strong>{position.opportunityTitle}</strong>
                    <p className="table-summary">{position.ownerName}</p>
                  </th>
                  <td>
                    <span className="cell-label" aria-hidden="true">
                      Principal · SIM
                    </span>
                    <span>{position.principalLabel}</span>
                  </td>
                  <td>
                    <span className="cell-label" aria-hidden="true">
                      Entry
                    </span>
                    <span>{position.entryRoundLabel}</span>
                  </td>
                  <td>
                    <span className="cell-label" aria-hidden="true">
                      Settlement
                    </span>
                    <span>{position.settlementRoundLabel}</span>
                  </td>
                  <td>
                    <span className="cell-label" aria-hidden="true">
                      Status
                    </span>
                    <span
                      className={
                        position.statusLabel === 'Open'
                          ? 'position-open'
                          : 'position-settled'
                      }
                    >
                      {position.statusLabel}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      type="button"
                      aria-label={`Inspect position ${position.opportunityTitle} for ${position.ownerName}`}
                      onClick={() => onInspectPosition?.(position)}
                    >
                      Details ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-copy">No market positions opened yet.</p>
        )}
      </section>
    </div>
  );
}
