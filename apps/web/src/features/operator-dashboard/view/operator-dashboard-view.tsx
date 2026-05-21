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
  const topbarStatusTone =
    viewModel.topbar.status.toLowerCase() === 'active'
      ? 'connected'
      : 'neutral';

  if (!viewModel.workspace.isVisible) {
    return (
      <>
        <header className="startup-top-app-bar">
          <h1>LLM Trading Simulator</h1>
          <button
            className="startup-help-button"
            type="button"
            aria-label="Help"
            onClick={viewModel.topbar.openHelp}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              help
            </span>
          </button>
        </header>

        <main className="startup-page-shell">
          <section className="startup-shell">
            <div className="startup-page-heading">
              <h2>Session Startup</h2>
              <p>Initialize simulation parameters and assemble agent roster.</p>
            </div>

            <SessionSetupCard {...viewModel.sessionSetup} />
          </section>
        </main>

        <HelpModal {...viewModel.helpModal} />
      </>
    );
  }

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
          <h1>LLM Trading Simulator</h1>
          {!viewModel.topbar.hasSelectedSession ? (
            <>
              <p className="eyebrow">Operator Console</p>
              <p className="lede">
                Create a session or reconnect to an existing one, then open the
                operator workspace once the simulation is live.
              </p>
            </>
          ) : null}
        </div>

        <div className="topbar-side">
          <div className="topbar-actions">
            <button
              className={
                viewModel.topbar.hasSelectedSession
                  ? 'icon-button topbar-help-button'
                  : 'ghost-button'
              }
              type="button"
              aria-label="Help"
              onClick={viewModel.topbar.openHelp}
            >
              {viewModel.topbar.hasSelectedSession ? (
                <span className="material-symbols-outlined" aria-hidden="true">
                  help
                </span>
              ) : (
                'Help'
              )}
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
                <span className="material-symbols-outlined" aria-hidden="true">
                  hub
                </span>
                <strong>
                  {viewModel.topbar.selectedSessionName ??
                    'No session connected'}
                </strong>
                <small>{viewModel.sessionSetup.selectedSessionId}</small>
              </article>
              <article className="topbar-metric">
                <span>Round</span>
                <strong>Round {viewModel.topbar.currentRound}</strong>
              </article>
              <article className={`topbar-metric status ${topbarStatusTone}`}>
                <span aria-hidden="true" />
                <strong>{viewModel.topbar.status}</strong>
              </article>
              <article className="topbar-metric highlight">
                <span className="material-symbols-outlined" aria-hidden="true">
                  info
                </span>
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
            <div className="workspace-control-lane">
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
                <BalancesCard
                  accounts={viewModel.workspace.balanceAccounts}
                  variant="compact"
                />
              </div>
            </div>

            <div className="workspace-main-lane">
              <div
                {...createDashboardCardProps(
                  shouldAnimateWorkspaceCards,
                  '320ms',
                )}
              >
                <TreasuryCard treasury={viewModel.workspace.treasury} />
              </div>
              <div
                {...createDashboardCardProps(
                  shouldAnimateWorkspaceCards,
                  '480ms',
                )}
              >
                <MarketVisibilityCard market={viewModel.workspace.market} />
              </div>
            </div>

            <aside className="workspace-audit-lane">
              <div
                {...createDashboardCardProps(
                  shouldAnimateWorkspaceCards,
                  '640ms',
                )}
              >
                <AuditTrailCard {...viewModel.workspace.auditTrail} />
              </div>
            </aside>
          </div>
        </section>
      )}

      <HelpModal {...viewModel.helpModal} />
    </main>
  );
}
