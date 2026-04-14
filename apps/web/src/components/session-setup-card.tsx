import type { GameSessionSummary } from '../lib/api';

import { CardCollapseButton, CardHeader, CardShell } from './card-shell';

interface AgentDraft {
  id: string;
  name: string;
  role: 'banker' | 'trader';
}

interface SessionSetupCardProps {
  mode: 'expanded' | 'collapsed';
  hasActiveSession: boolean;
  selectedSessionId: string;
  selectedSessionName?: string;
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
  onShowStartupForm: () => void;
  onHideStartupForm: () => void;
  onStartNewSession: () => void;
}

const agentRoleOptions = ['banker', 'trader'] as const;

export function SessionSetupCard({
  mode,
  hasActiveSession,
  selectedSessionId,
  selectedSessionName,
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
  onShowStartupForm,
  onHideStartupForm,
  onStartNewSession,
}: SessionSetupCardProps) {
  if (mode === 'collapsed') {
    return (
      <CardShell className="startup-strip">
        <div className="startup-strip-row">
          <div className="startup-strip-copy">
            <p className="panel-kicker">Startup</p>
            <h2>Session Startup</h2>
            <p>
              Connected to{' '}
              <strong>{selectedSessionName ?? 'Active session'}</strong>
            </p>
          </div>

          <div className="startup-strip-actions">
            <span className="status-chip muted mono">{selectedSessionId}</span>
            <button
              className="ghost-button"
              type="button"
              onClick={onShowStartupForm}
            >
              Change session
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={onStartNewSession}
            >
              New session
            </button>
          </div>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell className="session-startup-card">
      <CardHeader
        kicker="Startup"
        title="Session Startup"
        compact
        actions={
          <>
            <span className="status-chip">
              {hasActiveSession ? 'Active session' : 'Create or connect'}
            </span>
            {hasActiveSession ? (
              <CardCollapseButton
                isExpanded
                expandLabel="Show session startup"
                collapseLabel="Hide session startup"
                onToggle={onHideStartupForm}
              />
            ) : null}
          </>
        }
      />

      <div className="setup-section-body">
        <div className="startup-intro">
          <p className="startup-lede">
            Start a fresh session or reconnect to a saved run. The rest of the
            workspace stays out of the way until a session is active.
          </p>
        </div>

        <div className="startup-form-grid">
          <section className="startup-panel">
            <div className="section-copy">
              <strong>Create session</strong>
            </div>

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
                onChange={(event) =>
                  onInterestRateBpsChange(event.target.value)
                }
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
          </section>

          <section className="startup-panel startup-panel-connect">
            <div className="section-copy">
              <strong>Reconnect</strong>
            </div>

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

            <p className="startup-support-copy">
              Choose a prior session to reopen the operator workspace without
              recreating the roster.
            </p>
          </section>
        </div>

        {createError ? <p className="error-copy">{createError}</p> : null}
      </div>
    </CardShell>
  );
}
