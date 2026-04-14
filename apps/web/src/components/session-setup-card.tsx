import type { GameSessionSummary } from '../lib/api';
import { useState } from 'react';

import { CardCollapseButton, CardHeader, CardShell } from './card-shell';

interface AgentDraft {
  id: string;
  name: string;
  role: 'banker' | 'trader';
}

interface SessionSetupCardProps {
  selectedSessionId: string;
  availableSessions: GameSessionSummary[];
  sessionName: string;
  initialBalance: string;
  interestRateBps: string;
  agentDrafts: AgentDraft[];
  canRemoveAgent: boolean;
  isCreating: boolean;
  createError?: string;
  onSessionNameChange: (value: string) => void;
  onInitialBalanceChange: (value: string) => void;
  onInterestRateBpsChange: (value: string) => void;
  onSelectedSessionIdChange: (value: string) => void;
  onAddAgentDraft: () => void;
  onRemoveAgentDraft: (draftId: string) => void;
  onUpdateAgentDraft: (
    draftId: string,
    updater: (draft: AgentDraft) => AgentDraft,
  ) => void;
  onCreateSession: () => void;
}

const agentRoleOptions = ['banker', 'trader'] as const;

export function SessionSetupCard({
  selectedSessionId,
  availableSessions,
  sessionName,
  initialBalance,
  interestRateBps,
  agentDrafts,
  canRemoveAgent,
  isCreating,
  createError,
  onSessionNameChange,
  onInitialBalanceChange,
  onInterestRateBpsChange,
  onSelectedSessionIdChange,
  onAddAgentDraft,
  onRemoveAgentDraft,
  onUpdateAgentDraft,
  onCreateSession,
}: SessionSetupCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <CardShell className="rail-card">
      <CardHeader
        kicker="Setup"
        title="Session Setup"
        compact
        actions={
          <>
            <span className="status-chip">
              {selectedSessionId ? 'Active session' : 'New session'}
            </span>
            <CardCollapseButton
              isExpanded={isExpanded}
              expandLabel="Maximise session setup"
              collapseLabel="Minimise session setup"
              onToggle={() => setIsExpanded((current) => !current)}
            />
          </>
        }
      />

      {isExpanded ? (
        <div className="setup-section-body">
          <label className="field">
            <span>Session name</span>
            <input
              value={sessionName}
              onChange={(event) => onSessionNameChange(event.target.value)}
              placeholder="Morning liquidity drill"
            />
          </label>

          <label className="field">
            <span>Initial balance</span>
            <input
              value={initialBalance}
              onChange={(event) => onInitialBalanceChange(event.target.value)}
              placeholder="100.0000"
            />
          </label>

          <label className="field">
            <span>Treasury interest per round (bps)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={interestRateBps}
              onChange={(event) => onInterestRateBpsChange(event.target.value)}
              placeholder="250"
            />
          </label>

          <div className="section-copy">
            <strong>Agent roster</strong>
          </div>

          <div className="agent-stack">
            <div className="agent-stack-header">
              <span>Bots</span>
              <button
                className="agent-stack-button"
                type="button"
                onClick={onAddAgentDraft}
              >
                Add bot
              </button>
            </div>
            {agentDrafts.map((agent, index) => (
              <div key={agent.id} className="agent-editor-row">
                <label className="field compact">
                  <span>Bot {index + 1} name</span>
                  <input
                    value={agent.name}
                    onChange={(event) =>
                      onUpdateAgentDraft(agent.id, (draft) => ({
                        ...draft,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Agent name"
                  />
                </label>
                <label className="field compact">
                  <span>Role</span>
                  <select
                    value={agent.role}
                    onChange={(event) =>
                      onUpdateAgentDraft(agent.id, (draft) => ({
                        ...draft,
                        role: event.target.value as AgentDraft['role'],
                      }))
                    }
                  >
                    {agentRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="agent-remove-button"
                  type="button"
                  disabled={!canRemoveAgent}
                  onClick={() => onRemoveAgentDraft(agent.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            className="action-button primary"
            type="button"
            disabled={isCreating || agentDrafts.length === 0}
            onClick={onCreateSession}
          >
            {isCreating ? 'Creating session...' : 'Create session'}
          </button>

          <label className="field">
            <span>Connect to session</span>
            <select
              value={selectedSessionId}
              onChange={(event) =>
                onSelectedSessionIdChange(event.target.value)
              }
            >
              <option value="">Select a saved session</option>
              {availableSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name} ({session.id})
                </option>
              ))}
            </select>
          </label>

          {createError ? <p className="error-copy">{createError}</p> : null}
        </div>
      ) : null}
    </CardShell>
  );
}
