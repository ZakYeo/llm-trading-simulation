import { useState } from 'react';

import type { GameSessionRecord } from '../lib/api';
import { formatCurrency } from '../lib/formatters';

import { CardCollapseButton, CardHeader, CardShell } from './card-shell';

interface BalancesCardProps {
  selectedSession?: GameSessionRecord;
}

export function BalancesCard({ selectedSession }: BalancesCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!selectedSession) {
    return null;
  }

  return (
    <CardShell>
      <CardHeader
        kicker="Balances"
        title="Agent Accounts"
        actions={
          <CardCollapseButton
            isExpanded={isExpanded}
            expandLabel="Maximise balances"
            collapseLabel="Minimise balances"
            onToggle={() => setIsExpanded((current) => !current)}
          />
        }
      />

      {isExpanded ? (
        <div className="agent-balance-grid">
          {selectedSession.agents.map((agent) => (
            <article key={agent.id} className="balance-card">
              <header>
                <strong>{agent.name}</strong>
                <span>{agent.role}</span>
              </header>
              <dl>
                <div>
                  <dt>Available</dt>
                  <dd>{formatCurrency(agent.availableBalance)}</dd>
                </div>
                <div>
                  <dt>Reserved</dt>
                  <dd>{formatCurrency(agent.reservedBalance)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </CardShell>
  );
}
