import { useState } from 'react';

import type { GameSessionRecord } from '../lib/api';
import { formatCurrency } from '../lib/formatters';

import { CardCollapseButton, CardHeader, CardShell } from './card-shell';

interface TreasuryCardProps {
  selectedSession?: GameSessionRecord;
  variant?: 'default' | 'compact';
}

export function TreasuryCard({
  selectedSession,
  variant = 'default',
}: TreasuryCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!selectedSession) {
    return null;
  }

  const banker = selectedSession.agents.find(
    (agent) => agent.role === 'banker',
  );
  const trader = selectedSession.agents.find(
    (agent) => agent.role === 'trader',
  );
  const traderCustodyPosition =
    banker && trader
      ? selectedSession.bankerCustodyPositions.find(
          (position) =>
            position.bankerAgentId === banker.id &&
            position.ownerAgentId === trader.id,
        )
      : undefined;
  const totalCustodiedBalance = selectedSession.bankerCustodyPositions.reduce(
    (total, position) => total + Number.parseFloat(position.totalBalance),
    0,
  );
  const totalCustodiedInterest = selectedSession.bankerCustodyPositions.reduce(
    (total, position) => total + Number.parseFloat(position.accruedInterest),
    0,
  );
  const totalCustodiedPrincipal = selectedSession.bankerCustodyPositions.reduce(
    (total, position) => total + Number.parseFloat(position.principal),
    0,
  );

  if (variant === 'compact') {
    return (
      <CardShell className="treasury-shell summary-shell">
        <CardHeader
          kicker="Treasury"
          title="Custody Overview"
          compact
          actions={<span className="status-chip">Banker-led custody</span>}
        />

        <div className="summary-stat-grid">
          <article className="treasury-stat-card emphasis">
            <span>Total custodied</span>
            <strong>{formatCurrency(totalCustodiedBalance.toFixed(4))}</strong>
          </article>
          <article className="treasury-stat-card">
            <span>Accrued interest</span>
            <strong>{formatCurrency(totalCustodiedInterest.toFixed(4))}</strong>
          </article>
          <article className="treasury-stat-card">
            <span>Trader custody</span>
            <strong>
              {traderCustodyPosition
                ? formatCurrency(traderCustodyPosition.totalBalance)
                : formatCurrency('0.0000')}
            </strong>
          </article>
        </div>

        <div className="treasury-position-card summary-position-card">
          {traderCustodyPosition ? (
            <>
              <span>Trader principal / total</span>
              <div>
                <span>Trader principal with banker</span>
                <strong>
                  {formatCurrency(traderCustodyPosition.principal)}
                </strong>
              </div>
              <div>
                <span>Trader accrued interest</span>
                <strong>
                  {formatCurrency(traderCustodyPosition.accruedInterest)}
                </strong>
              </div>
              <div>
                <span>Redeemable total</span>
                <strong>
                  {formatCurrency(traderCustodyPosition.totalBalance)}
                </strong>
              </div>
            </>
          ) : (
            <>
              <span>Status</span>
              <strong>
                No trader funds are currently placed with the banker.
              </strong>
            </>
          )}
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell className="treasury-shell">
      <CardHeader
        kicker="Treasury"
        title="Custody Overview"
        actions={
          <>
            <span className="status-chip">Banker-led custody</span>
            <CardCollapseButton
              isExpanded={isExpanded}
              expandLabel="Maximise treasury overview"
              collapseLabel="Minimise treasury overview"
              onToggle={() => setIsExpanded((current) => !current)}
            />
          </>
        }
      />

      {isExpanded ? (
        <div className="treasury-layout">
          <div className="treasury-column full-width">
            <div className="treasury-summary-grid">
              <article className="treasury-stat-card emphasis">
                <span>Total custodied</span>
                <strong>
                  {formatCurrency(totalCustodiedBalance.toFixed(4))}
                </strong>
              </article>
              <article className="treasury-stat-card">
                <span>Total principal</span>
                <strong>
                  {formatCurrency(totalCustodiedPrincipal.toFixed(4))}
                </strong>
              </article>
              <article className="treasury-stat-card">
                <span>Accrued interest</span>
                <strong>
                  {formatCurrency(totalCustodiedInterest.toFixed(4))}
                </strong>
              </article>
              <article className="treasury-stat-card">
                <span>Trader custody</span>
                <strong>
                  {traderCustodyPosition
                    ? formatCurrency(traderCustodyPosition.totalBalance)
                    : formatCurrency('0.0000')}
                </strong>
              </article>
            </div>

            {traderCustodyPosition ? (
              <div className="treasury-position-card">
                <div>
                  <span>Trader principal with banker</span>
                  <strong>
                    {formatCurrency(traderCustodyPosition.principal)}
                  </strong>
                </div>
                <div>
                  <span>Trader accrued interest</span>
                  <strong>
                    {formatCurrency(traderCustodyPosition.accruedInterest)}
                  </strong>
                </div>
                <div>
                  <span>Redeemable total</span>
                  <strong>
                    {formatCurrency(traderCustodyPosition.totalBalance)}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="empty-copy treasury-empty">
                No trader funds are currently placed with the banker.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </CardShell>
  );
}
