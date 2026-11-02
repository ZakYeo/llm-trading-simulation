import type { BalanceAccountViewData } from '../features/session-overview/model/session-overview';

export function BalancesCard({
  accounts = [],
  onInspect,
}: {
  accounts?: BalanceAccountViewData[];
  onInspect?: (account: BalanceAccountViewData) => void;
}) {
  if (!accounts.length) return null;
  return (
    <section className="ledger-section" aria-label="Agent accounts">
      <header className="section-heading">
        <h2>Agent accounts</h2>
        <span className="field-note">Available and reserved · SIM</span>
      </header>
      <div className="agent-balance-grid">
        {accounts.map((account) => (
          <article key={account.id} className="balance-card">
            <header>
              <div>
                <strong>{account.name}</strong>
                <span>{account.role}</span>
              </div>
              {onInspect && (
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Show account details for ${account.name}`}
                  onClick={() => onInspect(account)}
                >
                  Details ↗
                </button>
              )}
            </header>
            <dl>
              <div>
                <dt>Available</dt>
                <dd>{account.availableBalanceLabel}</dd>
              </div>
              <div>
                <dt>Reserved</dt>
                <dd>{account.reservedBalanceLabel}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
