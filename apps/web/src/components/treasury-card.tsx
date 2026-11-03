import type { TreasuryViewData } from '../features/session-overview/model/session-overview';

export function TreasuryCard({ treasury }: { treasury?: TreasuryViewData }) {
  if (!treasury) return null;
  return (
    <section
      className="ledger-section treasury-shell"
      aria-label="Custody overview"
    >
      <header className="section-heading">
        <h2>Custody overview</h2>
        <span className="field-note">Funds held by the banker · SIM</span>
      </header>
      <dl className="custody-totals">
        <div>
          <dt>Total custodied balance</dt>
          <dd>{treasury.totalCustodiedBalanceLabel}</dd>
        </div>
        <div>
          <dt>Custodied principal</dt>
          <dd>{treasury.totalCustodiedPrincipalLabel}</dd>
        </div>
        <div>
          <dt>Total accrued interest</dt>
          <dd>{treasury.totalCustodiedInterestLabel}</dd>
        </div>
      </dl>
      {treasury.depositTerms && treasury.depositTerms.length > 0 && (
        <div className="deposit-terms">
          <h3>Agreed deposit terms</h3>
          {treasury.depositTerms.map((lot) => (
            <p key={lot.key}>
              {lot.owner} → {lot.banker}: {lot.principal} SIM at {lot.rate} per
              round · flexible withdrawal
            </p>
          ))}
        </div>
      )}
      {treasury.traderCustodyPosition ? (
        <dl className="custody-breakdown">
          <div>
            <dt>Trader custody balance</dt>
            <dd>{treasury.traderCustodyBalanceLabel}</dd>
          </div>
          <div>
            <dt>Trader principal with banker</dt>
            <dd>{treasury.traderCustodyPosition.principalLabel}</dd>
          </div>
          <div>
            <dt>Trader accrued interest</dt>
            <dd>{treasury.traderCustodyPosition.accruedInterestLabel}</dd>
          </div>
          <div>
            <dt>Redeemable total</dt>
            <dd>{treasury.traderCustodyPosition.totalBalanceLabel}</dd>
          </div>
        </dl>
      ) : (
        <p className="empty-copy">
          No trader funds are currently placed with the banker.
        </p>
      )}
    </section>
  );
}
