import { useState } from 'react';

import type { BalanceAccountViewData } from '../features/session-overview/model/session-overview';

import {
  CardBody,
  CardCollapseButton,
  CardHeader,
  CardShell,
} from './card-shell';

interface BalancesCardProps {
  accounts?: BalanceAccountViewData[];
  variant?: 'default' | 'compact';
}

export function BalancesCard({
  accounts = [],
  variant = 'default',
}: BalancesCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [inspectedAgentIds, setInspectedAgentIds] = useState<string[]>([]);

  if (accounts.length === 0) {
    return null;
  }

  function toggleInspectedAgent(agentId: string) {
    setInspectedAgentIds((current) =>
      current.includes(agentId)
        ? current.filter((currentAgentId) => currentAgentId !== agentId)
        : [...current, agentId],
    );
  }

  function renderPersonality(agent: BalanceAccountViewData) {
    if (agent.personalityRows.length === 0) {
      return <p className="balance-info-empty">No custom personality saved.</p>;
    }

    return (
      <dl className="balance-info-list">
        {agent.personalityRows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  function renderBalanceCard(
    agent: BalanceAccountViewData,
    extraClassName = '',
  ) {
    const isInspecting = inspectedAgentIds.includes(agent.id);

    return (
      <article
        key={agent.id}
        className={`balance-card${extraClassName ? ` ${extraClassName}` : ''}${isInspecting ? ' balance-card-inspecting' : ''}`}
      >
        <header>
          <div>
            <strong>{agent.name}</strong>
            <span>{agent.role}</span>
          </div>
          <button
            className="icon-button balance-info-button"
            type="button"
            aria-label={`Show account details for ${agent.name}`}
            onClick={() => toggleInspectedAgent(agent.id)}
          >
            i
          </button>
        </header>
        <dl>
          <div>
            <dt>Available</dt>
            <dd>{agent.availableBalanceLabel}</dd>
          </div>
          <div>
            <dt>Reserved</dt>
            <dd>{agent.reservedBalanceLabel}</dd>
          </div>
        </dl>
        {isInspecting ? (
          <div className="balance-info-panel">
            <div className="balance-info-section">
              <span className="balance-info-heading">Personality</span>
              {renderPersonality(agent)}
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <CardShell className="summary-shell balances-summary-shell">
        <CardHeader kicker="Balances" title="Agent Accounts" compact />

        <div className="summary-stack">
          {accounts.map((agent) =>
            renderBalanceCard(agent, 'summary-balance-card'),
          )}
        </div>
      </CardShell>
    );
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

      <CardBody isExpanded={isExpanded}>
        <div className="agent-balance-grid">
          {accounts.map((agent) => renderBalanceCard(agent))}
        </div>
      </CardBody>
    </CardShell>
  );
}
