import { useState } from 'react';

import type { TreasuryViewData } from '../features/session-overview/model/session-overview';
import { formatCurrency } from '../lib/formatters';

import {
  CardBody,
  CardCollapseButton,
  CardHeader,
  CardShell,
} from './card-shell';

interface TreasuryCardProps {
  treasury?: TreasuryViewData;
  variant?: 'default' | 'compact';
}

export function TreasuryCard({
  treasury,
  variant = 'default',
}: TreasuryCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!treasury) {
    return null;
  }

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
            <strong>{formatCurrency(treasury.totalCustodiedBalance)}</strong>
          </article>
          <article className="treasury-stat-card">
            <span>Accrued interest</span>
            <strong>{formatCurrency(treasury.totalCustodiedInterest)}</strong>
          </article>
          <article className="treasury-stat-card">
            <span>Trader custody</span>
            <strong>{formatCurrency(treasury.traderCustodyBalance)}</strong>
          </article>
        </div>

        <div className="treasury-position-card summary-position-card">
          {treasury.traderCustodyPosition ? (
            <>
              <span>Trader principal / total</span>
              <div>
                <span>Trader principal with banker</span>
                <strong>
                  {formatCurrency(treasury.traderCustodyPosition.principal)}
                </strong>
              </div>
              <div>
                <span>Trader accrued interest</span>
                <strong>
                  {formatCurrency(
                    treasury.traderCustodyPosition.accruedInterest,
                  )}
                </strong>
              </div>
              <div>
                <span>Redeemable total</span>
                <strong>
                  {formatCurrency(treasury.traderCustodyPosition.totalBalance)}
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

      <CardBody isExpanded={isExpanded}>
        <div className="treasury-layout">
          <div className="treasury-column full-width">
            <div className="treasury-summary-grid">
              <article className="treasury-stat-card emphasis">
                <span>Total custodied</span>
                <strong>
                  {formatCurrency(treasury.totalCustodiedBalance)}
                </strong>
              </article>
              <article className="treasury-stat-card">
                <span>Total principal</span>
                <strong>
                  {formatCurrency(treasury.totalCustodiedPrincipal)}
                </strong>
              </article>
              <article className="treasury-stat-card">
                <span>Accrued interest</span>
                <strong>
                  {formatCurrency(treasury.totalCustodiedInterest)}
                </strong>
              </article>
              <article className="treasury-stat-card">
                <span>Trader custody</span>
                <strong>{formatCurrency(treasury.traderCustodyBalance)}</strong>
              </article>
            </div>

            {treasury.traderCustodyPosition ? (
              <div className="treasury-position-card">
                <div>
                  <span>Trader principal with banker</span>
                  <strong>
                    {formatCurrency(treasury.traderCustodyPosition.principal)}
                  </strong>
                </div>
                <div>
                  <span>Trader accrued interest</span>
                  <strong>
                    {formatCurrency(
                      treasury.traderCustodyPosition.accruedInterest,
                    )}
                  </strong>
                </div>
                <div>
                  <span>Redeemable total</span>
                  <strong>
                    {formatCurrency(
                      treasury.traderCustodyPosition.totalBalance,
                    )}
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
      </CardBody>
    </CardShell>
  );
}
