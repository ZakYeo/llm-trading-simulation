import type { WorkspaceViewModel } from '../../operator-dashboard/view-model/use-workspace-view-model';

export function FinancialContext({ vm }: { vm: WorkspaceViewModel }) {
  return (
    <aside className="context-column" aria-label="Financial context">
      <section className="context-section">
        <div className="section-heading">
          <h2>At a glance</h2>
          <button
            type="button"
            className="text-button"
            onClick={() => vm.setActiveTab('Finances')}
          >
            Full ledger ↗
          </button>
        </div>
        <div className="account-summaries">
          {vm.workspace.balanceAccounts.map((account) => (
            <article key={account.id} className="account-summary">
              <button
                className="account-link"
                type="button"
                onClick={() => vm.inspectAccount(account)}
              >
                <strong>{account.name}</strong>
                <span>{account.role} ↗</span>
              </button>
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
      <section className="context-section">
        <h2>Held in custody</h2>
        <p className="context-amount">
          {vm.workspace.treasury?.totalCustodiedBalanceLabel ?? '—'}{' '}
          <small>SIM</small>
        </p>
        <p className="field-note">
          Principal {vm.workspace.treasury?.totalCustodiedPrincipalLabel ?? '—'}{' '}
          · Interest {vm.workspace.treasury?.totalCustodiedInterestLabel ?? '—'}
        </p>
      </section>
      <section className="context-section">
        <h2>Next settlement</h2>
        <p className="field-note">
          On advancing to round {vm.topbar.currentRound + 1}
        </p>
        {vm.upcomingSettlements.length ? (
          vm.upcomingSettlements.map((position) => (
            <button
              key={position.key}
              className="upcoming-position"
              type="button"
              onClick={() => vm.inspectPosition(position)}
            >
              <strong>{position.opportunityTitle}</strong>
              <span>
                {position.ownerName} · {position.principalLabel} SIM
              </span>
            </button>
          ))
        ) : (
          <p className="empty-copy">
            No open positions settle on the next advancement.
          </p>
        )}
      </section>
      <section className="context-section context-note">
        <span className="eyebrow">A note on the round</span>
        <p>
          Agents can talk and trade across several turns. Interest and eligible
          market settlements happen when you advance.
        </p>
      </section>
    </aside>
  );
}
