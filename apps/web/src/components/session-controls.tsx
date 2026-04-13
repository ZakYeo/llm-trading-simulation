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
  onAddAgentDraft,
  onRemoveAgentDraft,
  onUpdateAgentDraft,
  onCreateSession,
  onRunTurns,
  onAdvanceRound,
}: SessionControlsProps) {
  const normalizedTurnCount = Number.isNaN(turnCount)
    ? 1
    : Math.min(10, Math.max(1, turnCount));

  return (
    <section className="panel command-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Control</p>
          <h2>Session Controls</h2>
        </div>
        <span className="status-chip">
          {selectedSessionId ? 'Connected' : 'No session'}
        </span>
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

      <div className="agent-stack">
        <div className="agent-stack-header">
          <span>Roster</span>
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
        <span>Active session id</span>
        <input
          value={selectedSessionId}
          onChange={(event) => onSelectedSessionIdChange(event.target.value)}
          placeholder="Paste a session id"
        />
      </label>

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

      <div className="turn-planner">
        <div className="turn-planner-copy">
          <strong>Run planner</strong>
          <p>
            Queue the next {normalizedTurnCount} turn
            {normalizedTurnCount === 1 ? '' : 's'} for the active session.
          </p>
        </div>
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
      </div>

      <button
        className="action-button"
        type="button"
        disabled={!selectedSessionId || isRunning}
        onClick={onRunTurns}
      >
        {isRunning
          ? `Running ${normalizedTurnCount} turn${normalizedTurnCount === 1 ? '' : 's'}...`
          : `Run next ${normalizedTurnCount} turn${normalizedTurnCount === 1 ? '' : 's'}`}
      </button>

      <div className="turn-planner">
        <div className="turn-planner-copy">
          <strong>Round settlement</strong>
          <p>
            Current round: {currentRound ?? 0}. Advance explicitly to apply the
            backend default custody interest rate.
          </p>
        </div>
      </div>

      <button
        className="action-button"
        type="button"
        disabled={!selectedSessionId || isAdvancing}
        onClick={onAdvanceRound}
      >
        {isAdvancing ? 'Advancing round...' : 'Advance Round'}
      </button>

      <div className="feedback-block">
        {latestRunSummary ? <p>{latestRunSummary}</p> : null}
        {createError ? <p className="error-copy">{createError}</p> : null}
        {runError ? <p className="error-copy">{runError}</p> : null}
        {advanceError ? <p className="error-copy">{advanceError}</p> : null}
      </div>
    </section>
  );
}
