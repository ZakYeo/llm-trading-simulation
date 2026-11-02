import { FinancialContext } from '../../session-overview/view/financial-context';
import { SimulationJournal } from '../../audit-trail/view/simulation-journal';
import { AuditTrailCard } from '../../../components/audit-trail-card';
import { BalancesCard } from '../../../components/balances-card';
import { MarketVisibilityCard } from '../../../components/market-visibility-card';
import { OperateCard } from '../../../components/operate-card';
import { SessionSetupCard } from '../../../components/session-setup-card';
import { TreasuryCard } from '../../../components/treasury-card';
import { Dialog } from '../../../shared/ui/dialog';
import { useWorkspaceViewModel } from '../view-model/use-workspace-view-model';
import type { ThemePreference } from '../model/workspace';
import { HelpModal } from './help-modal';

export function OperatorDashboardView() {
  const vm = useWorkspaceViewModel();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to content
      </a>
      <header className="app-header">
        <a className="wordmark" href="#workspace">
          <span className="brand-mark" aria-hidden="true">
            ↗
          </span>
          <span>
            <strong>LLM Trading Simulator</strong>
          </span>
        </a>
        {vm.workspace.isVisible && (
          <div className="session-identity">
            <span className="topbar-metric">
              <span className="sr-only">Session</span>
              <strong>
                {vm.topbar.selectedSessionName ?? 'Loading session…'}
              </strong>
            </span>
            <span className="topbar-metric">
              <span className="sr-only">Round</span>Round{' '}
              {vm.topbar.currentRound}
            </span>
            <span className="session-status">{vm.topbar.status}</span>
          </div>
        )}
        <div className="header-actions">
          <label className="theme-control">
            <span className="sr-only">Color theme</span>
            <select
              value={vm.theme.preference}
              onChange={(event) =>
                vm.theme.setPreference(event.target.value as ThemePreference)
              }
            >
              <option value="system">System theme</option>
              <option value="light">Light theme</option>
              <option value="dark">Dark theme</option>
            </select>
          </label>
          <button
            className="quiet-button"
            type="button"
            onClick={vm.topbar.openHelp}
          >
            Help
          </button>
        </div>
      </header>
      <main id="workspace" tabIndex={-1}>
        {!vm.workspace.isVisible ? (
          <section className="startup-page-shell">
            <div className="page-intro">
              <p className="eyebrow">A new experiment</p>
              <h1>Give your agents a starting point.</h1>
              <p>
                Create a session, set their personalities, and watch the
                negotiation unfold.
              </p>
            </div>
            <SessionSetupCard {...vm.sessionSetup} />
            {vm.sessionSetup.sessionsError && (
              <p className="error-copy" role="alert">
                Could not load saved sessions: {vm.sessionSetup.sessionsError}
              </p>
            )}
          </section>
        ) : (
          <>
            <SessionSetupCard {...vm.sessionSetup} />
            {vm.workspace.isLoading && <p role="status">Loading session…</p>}
            {vm.workspace.loadError && (
              <p className="error-copy" role="alert">
                Could not load this session: {vm.workspace.loadError}
              </p>
            )}
            {vm.workspace.replayError && (
              <p className="error-copy" role="alert">
                Could not load activity: {vm.workspace.replayError}
              </p>
            )}
            <OperateCard {...vm.workspace.operate} />
            <div className="run-status topbar-metric" role="status">
              <span className="sr-only">Latest activity</span>
              {vm.workspace.auditTrail.isTurnFlowInProgress ? (
                <span className="live-run-banner">
                  {vm.workspace.auditTrail.inProgressLabel}
                </span>
              ) : (
                vm.topbar.latestRunSummary || 'Ready when you are.'
              )}
            </div>
            <nav className="workspace-nav" aria-label="Session views">
              {vm.tabs.map((tab) => (
                <a
                  key={tab}
                  href={vm.navigation.href(tab)}
                  aria-current={vm.activeTab === tab ? 'page' : undefined}
                >
                  {tab}
                </a>
              ))}
            </nav>
            <section
              className="workspace-panel"
              role="region"
              id={`panel-${vm.activeTab}`}
              aria-label={vm.activeTab}
              tabIndex={0}
            >
              {vm.activeTab === 'Conversation' && (
                <div className="simulation-layout">
                  <div>
                    <div className="view-intro">
                      <p className="eyebrow">The conversation, in context</p>
                      <h1>Conversation</h1>
                      <p>
                        Follow your agents as they negotiate, move funds, and
                        take positions.
                      </p>
                    </div>
                    <SimulationJournal
                      viewModel={vm.workspace.journal}
                      onInspect={vm.inspectEvent}
                      isFetching={vm.workspace.auditTrail.isFetching}
                    />
                  </div>
                  <FinancialContext vm={vm} />
                </div>
              )}
              {vm.activeTab === 'Finances' && (
                <>
                  <div className="view-intro">
                    <p className="eyebrow">Follow the money</p>
                    <h1>Finances</h1>
                    <p>
                      Balances, custody, and market exposure from the current
                      session state.
                    </p>
                  </div>
                  <BalancesCard
                    accounts={vm.workspace.balanceAccounts}
                    onInspect={vm.inspectAccount}
                  />
                  <TreasuryCard treasury={vm.workspace.treasury} />
                  <MarketVisibilityCard
                    market={vm.workspace.market}
                    onInspectOpportunity={vm.inspectOpportunity}
                    onInspectPosition={vm.inspectPosition}
                  />
                </>
              )}
              {vm.activeTab === 'History' && (
                <>
                  <div className="view-intro">
                    <p className="eyebrow">Every decision leaves a trace</p>
                    <h1>History</h1>
                    <p>
                      Inspect the complete activity record, one round at a time.
                    </p>
                  </div>
                  <AuditTrailCard
                    {...vm.workspace.auditTrail}
                    onInspect={vm.inspectEvent}
                  />
                </>
              )}
            </section>
          </>
        )}
      </main>
      <footer className="app-footer">
        <span>A conversation about risk, trust, and returns.</span>
        <span>Simulation currency · SIM</span>
      </footer>
      <HelpModal {...vm.helpModal} />
      {vm.detail && (
        <Dialog title={vm.detail.title} onClose={vm.closeDetail} drawer>
          {vm.detail.subtitle && <p>{vm.detail.subtitle}</p>}
          {vm.detail.paragraphs?.map((text, index) => (
            <p key={index}>{text}</p>
          ))}
          <dl className="detail-list">
            {vm.detail.rows?.map((row, index) => (
              <div key={index}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </Dialog>
      )}
    </div>
  );
}
