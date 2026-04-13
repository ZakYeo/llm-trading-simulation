import { useState } from 'react';

interface AgentDraft {
  id: string;
  name: string;
  role: 'banker' | 'trader';
}

interface SessionControlsProps {
  selectedSessionId: string;
  currentRound?: number;
  sessionName: string;
  initialBalance: string;
  turnCount: number;
  interestRateBps: string;
  latestRunSummary: string;
  agentDrafts: AgentDraft[];
  canRemoveAgent: boolean;
  isCreating: boolean;
  isRunning: boolean;
  isAdvancing: boolean;
  createError?: string;
  runError?: string;
  advanceError?: string;
  onSessionNameChange: (value: string) => void;
  onInitialBalanceChange: (value: string) => void;
  onSelectedSessionIdChange: (value: string) => void;
  onTurnCountChange: (value: number) => void;
  onInterestRateBpsChange: (value: string) => void;
  onAddAgentDraft: () => void;
  onRemoveAgentDraft: (draftId: string) => void;
  onUpdateAgentDraft: (
    draftId: string,
    updater: (draft: AgentDraft) => AgentDraft,
  ) => void;
  onCreateSession: () => void;
  onRunTurns: () => void;
  onAdvanceRound: () => void;
}

const agentRoleOptions = ['banker', 'trader'] as const;

export function SessionControls({
  selectedSessionId,
  currentRound,
  sessionName,
  initialBalance,
  turnCount,
  interestRateBps,
  latestRunSummary,
  agentDrafts,
  canRemoveAgent,
  isCreating,
  isRunning,
  isAdvancing,
  createError,
  runError,
  advanceError,
  onSessionNameChange,
  onInitialBalanceChange,
  onSelectedSessionIdChange,
  onTurnCountChange,
  onInterestRateBpsChange,
  onAddAgentDraft,
  onRemoveAgentDraft,
  onUpdateAgentDraft,
  onCreateSession,
  onRunTurns,
  onAdvanceRound,
}: SessionControlsProps) {
  const [isSetupExpanded, setIsSetupExpanded] = useState(true);
  const normalizedTurnCount = Number.isNaN(turnCount)
    ? 1
    : Math.min(10, Math.max(1, turnCount));

  return (
    <aside className="control-rail">
      <section className="panel rail-card">
        <div className="panel-header compact">
          <div>
            <p className="panel-kicker">Setup</p>
            <h2>Session Setup</h2>
          </div>
          <div className="panel-header-actions">
            <span className="status-chip">
              {selectedSessionId ? 'Active session' : 'New session'}
            </span>
            <button
              className="icon-button"
              aria-label={
                isSetupExpanded
                  ? 'Minimise session setup'
                  : 'Maximise session setup'
              }
              type="button"
              onClick={() => setIsSetupExpanded((current) => !current)}
            >
              {isSetupExpanded ? '−' : '+'}
            </button>
          </div>
        </div>

        {isSetupExpanded ? (
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
                onChange={(event) =>
                  onInterestRateBpsChange(event.target.value)
                }
                placeholder="250"
              />
            </label>

            <div className="section-copy">
              <strong>Agent roster</strong>
              <p>
                Define the banker and trader before starting or replacing a
                session.
              </p>
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
              <span>Or connect to session id</span>
              <input
                value={selectedSessionId}
                onChange={(event) =>
                  onSelectedSessionIdChange(event.target.value)
                }
                placeholder="Paste an existing session id"
              />
            </label>

            {createError ? <p className="error-copy">{createError}</p> : null}
          </div>
        ) : (
          <div className="collapsed-setup-copy">
            <p>
              Session setup is hidden. Expand it to create a new session or edit
              the roster.
            </p>
          </div>
        )}
      </section>

      <section className="panel rail-card">
        <div className="panel-header compact">
          <div>
            <p className="panel-kicker">Operate</p>
            <h2>Run The Session</h2>
          </div>
          <span className="status-chip muted">Round {currentRound ?? 0}</span>
        </div>

        <label className="field">
          <span>Turn count</span>
          <input
            type="number"
            min={1}
            max={10}
            value={normalizedTurnCount}
            onChange={(event) =>
              onTurnCountChange(Number.parseInt(event.target.value || '1', 10))
            }
          />
        </label>

        <div className="turn-preset-row">
          {[1, 2, 4, 8].map((preset) => (
            <button
              key={preset}
              className={
                preset === normalizedTurnCount
                  ? 'turn-preset active'
                  : 'turn-preset'
              }
              type="button"
              onClick={() => onTurnCountChange(preset)}
            >
              {preset} turn{preset === 1 ? '' : 's'}
            </button>
          ))}
        </div>

        <div className="action-stack">
          <button
            className="action-button primary"
            type="button"
            disabled={!selectedSessionId || isRunning}
            onClick={onRunTurns}
          >
            {isRunning
              ? `Running ${normalizedTurnCount} turn${normalizedTurnCount === 1 ? '' : 's'}...`
              : `Run next ${normalizedTurnCount} turn${normalizedTurnCount === 1 ? '' : 's'}`}
          </button>

          <button
            className="action-button secondary"
            type="button"
            disabled={!selectedSessionId || isAdvancing}
            onClick={onAdvanceRound}
          >
            {isAdvancing ? 'Advancing round...' : 'Advance round settlement'}
          </button>
        </div>

        <div className="activity-note">
          <span>Latest activity</span>
          <strong>{latestRunSummary || 'No actions yet.'}</strong>
        </div>

        {runError ? <p className="error-copy">{runError}</p> : null}
        {advanceError ? <p className="error-copy">{advanceError}</p> : null}
      </section>
    </aside>
  );
}
