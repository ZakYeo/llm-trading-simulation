import type { CSSProperties } from 'react';

import { AuditTrailCard } from '../../../components/audit-trail-card';
import { BalancesCard } from '../../../components/balances-card';
import { MarketVisibilityCard } from '../../../components/market-visibility-card';
import { OperateCard } from '../../../components/operate-card';
import { SessionSetupCard } from '../../../components/session-setup-card';
import { TreasuryCard } from '../../../components/treasury-card';
import { HelpModal } from './help-modal';
import { useOperatorDashboardViewModel } from '../view-model/use-operator-dashboard-view-model';

function createDashboardCardProps(shouldAnimate: boolean, delay: string) {
  return {
    className: shouldAnimate
      ? 'dashboard-card session-card-enter'
      : 'dashboard-card',
    style: { '--card-enter-delay': delay } as CSSProperties,
  };
}

export function OperatorDashboardView() {
  const viewModel = useOperatorDashboardViewModel();
  const shouldAnimateWorkspaceCards = viewModel.workspace.shouldAnimateCards;

  return (
    <main className="app-shell">
      <section
        className={
          viewModel.topbar.hasSelectedSession
            ? 'topbar panel topbar-connected'
            : 'topbar panel'
        }
      >
        <div className="topbar-copy">
          <p className="eyebrow">Operator Console</p>
          <h1>LLM Trading Simulator</h1>
          {!viewModel.topbar.hasSelectedSession ? (
            <p className="lede">
              Create a session or reconnect to an existing one, then open the
              operator workspace once the simulation is live.
            </p>
          ) : null}
        </div>

        <div className="topbar-side">
          <div className="topbar-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={viewModel.topbar.openHelp}
            >
              Help
            </button>
          </div>

          {viewModel.topbar.shouldShowHeaderMetrics ? (
            <div
              className={
                viewModel.topbar.shouldAnimateHeaderMetrics
                  ? 'topbar-metrics topbar-metrics-enter'
                  : 'topbar-metrics'
              }
            >
              <article className="topbar-metric">
                <span>Session</span>
                <strong>
                  {viewModel.topbar.selectedSessionName ??
                    'No session connected'}
                </strong>
              </article>
              <article className="topbar-metric">
                <span>Round</span>
                <strong>{viewModel.topbar.currentRound}</strong>
              </article>
              <article className="topbar-metric">
                <span>Status</span>
                <strong>{viewModel.topbar.status}</strong>
              </article>
              <article className="topbar-metric highlight">
                <span>Latest activity</span>
                <strong>
                  {viewModel.topbar.latestRunSummary ||
                    'Awaiting operator input'}
                </strong>
              </article>
            </div>
          ) : null}
        </div>
      </section>

      {!viewModel.workspace.isVisible ? (
        <section className="startup-shell">
          <SessionSetupCard {...viewModel.sessionSetup} />
        </section>
      ) : (
        <section className="connected-shell">
          <SessionSetupCard {...viewModel.sessionSetup} />

          <div className="connected-workspace">
            <div className="workspace-main-lane">
              <div
                {...createDashboardCardProps(
                  shouldAnimateWorkspaceCards,
                  '0ms',
                )}
              >
                <OperateCard {...viewModel.workspace.operate} />
              </div>
              <div
                {...createDashboardCardProps(
                  shouldAnimateWorkspaceCards,
                  '160ms',
                )}
              >
                <AuditTrailCard {...viewModel.workspace.auditTrail} />
              </div>
            </div>

            <aside className="workspace-side-lane">
              <div
                {...createDashboardCardProps(
                  shouldAnimateWorkspaceCards,
                  '320ms',
                )}
              >
                <BalancesCard
                  accounts={viewModel.workspace.balanceAccounts}
                  variant="compact"
                />
              </div>
              <div
                {...createDashboardCardProps(
                  shouldAnimateWorkspaceCards,
                  '480ms',
                )}
              >
                <TreasuryCard
                  treasury={viewModel.workspace.treasury}
                  variant="compact"
                />
              </div>
              <div
                {...createDashboardCardProps(
                  shouldAnimateWorkspaceCards,
                  '640ms',
                )}
              >
                <MarketVisibilityCard
                  market={viewModel.workspace.market}
                  variant="compact"
                />
              </div>
            </aside>
          </div>
        </section>
      )}

      <HelpModal {...viewModel.helpModal} />
    </main>
  );
}
