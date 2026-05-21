import type { AgentDraft } from '../features/session-setup/model/agent-drafts';

import { CardShell } from './card-shell';

const bankerSliderFields = [
  {
    key: 'warmth',
    label: 'Warmth',
    lowLabel: 'Cold',
    highLabel: 'Warm',
  },
  {
    key: 'salesAggression',
    label: 'Sales aggression',
    lowLabel: 'Soft',
    highLabel: 'Pushy',
  },
  {
    key: 'riskDiscipline',
    label: 'Risk discipline',
    lowLabel: 'Loose',
    highLabel: 'Strict',
  },
] as const;

const traderSliderFields = [
  {
    key: 'assertiveness',
    label: 'Assertiveness',
    lowLabel: 'Cautious',
    highLabel: 'Direct',
  },
  {
    key: 'riskAppetite',
    label: 'Risk appetite',
    lowLabel: 'Defensive',
    highLabel: 'Aggressive',
  },
  {
    key: 'convictionThreshold',
    label: 'Conviction threshold',
    lowLabel: 'Acts early',
    highLabel: 'Needs edge',
  },
] as const;

interface SessionSetupCardProps {
  mode: 'expanded' | 'collapsed';
  hasActiveSession: boolean;
  selectedSessionId: string;
  selectedSessionName?: string;
  availableSessions: Array<{
    value: string;
    label: string;
  }>;
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
  onAgentNameChange: (draftId: string, value: string) => void;
  onAgentRoleChange: (draftId: string, value: AgentDraft['role']) => void;
  onAgentPersonalityValueChange: (
    draftId: string,
    key: string,
    value: number,
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
  onAgentNameChange,
  onAgentRoleChange,
  onAgentPersonalityValueChange,
  onCreateSession,
  onShowStartupForm,
  onHideStartupForm,
  onStartNewSession,
}: SessionSetupCardProps) {
  if (mode === 'collapsed') {
    return (
      <CardShell className="startup-strip">
        <span className="visually-hidden">
          Connected to {selectedSessionName ?? 'Active session'}{' '}
          {selectedSessionId}
        </span>
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
              <span className="material-symbols-outlined" aria-hidden="true">
                swap_horiz
              </span>
              Change session
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={onStartNewSession}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add_circle
              </span>
              New session
            </button>
          </div>
        </div>
      </CardShell>
    );
  }

  return (
    <div className="session-startup-card">
      {hasActiveSession ? (
        <div className="startup-active-row">
          <span className="status-chip">Active session</span>
          <button
            className="ghost-button"
            type="button"
            onClick={onHideStartupForm}
          >
            Hide startup
          </button>
        </div>
      ) : null}

      <CardShell className="startup-panel startup-parameters-panel">
        <h2 className="startup-section-title">Global Parameters</h2>

        <div className="startup-parameter-grid">
          <label className="field startup-field startup-field-full">
            <span>Session name</span>
            <input
              value={sessionName}
              onChange={(event) => onSessionNameChange(event.target.value)}
              placeholder="Morning liquidity drill"
            />
          </label>

          <label className="field startup-field">
            <span>Initial balance (SIM)</span>
            <input
              value={initialBalance}
              onChange={(event) => onInitialBalanceChange(event.target.value)}
              placeholder="100.0000"
            />
          </label>

          <label className="field startup-field">
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

          <label className="field startup-field startup-field-full startup-connect-field">
            <span>Connect to session</span>
            <select
              value={selectedSessionId}
              onChange={(event) =>
                onSelectedSessionIdChange(event.target.value)
              }
            >
              <option value="">Select a saved session</option>
              {availableSessions.map((session) => (
                <option key={session.value} value={session.value}>
                  {session.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </CardShell>

      <CardShell className="startup-panel startup-roster-panel">
        <div className="startup-roster-header">
          <h2 className="startup-section-title">Agent Roster</h2>
          <button
            className="agent-stack-button"
            type="button"
            onClick={onAddAgentDraft}
            disabled={hasActiveSession}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              add
            </span>
            Add agent
          </button>
        </div>

        <div className="agent-stack">
          {agentDrafts.map((agent) => (
            <div key={agent.id} className="agent-editor-card">
              <div className="agent-card-header">
                <div className="agent-card-identity">
                  <input
                    aria-label={`${agent.name} name`}
                    value={agent.name}
                    disabled={hasActiveSession}
                    onChange={(event) =>
                      onAgentNameChange(agent.id, event.target.value)
                    }
                    placeholder="Agent name"
                  />
                  <label>
                    <span className="sr-only">Role</span>
                    <select
                      value={agent.role}
                      disabled={hasActiveSession}
                      onChange={(event) =>
                        onAgentRoleChange(
                          agent.id,
                          event.target.value as AgentDraft['role'],
                        )
                      }
                    >
                      {agentRoleOptions.map((role) => (
                        <option key={role} value={role}>
                          Role: {role}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  className="agent-remove-button"
                  type="button"
                  aria-label={`Remove ${agent.name}`}
                  disabled={hasActiveSession || !canRemoveAgent}
                  onClick={() => onRemoveAgentDraft(agent.id)}
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    close
                  </span>
                </button>
              </div>

              <div className="agent-personality-panel">
                {agent.personality.kind === 'banker'
                  ? renderPersonalitySliders(
                      agent,
                      bankerSliderFields,
                      hasActiveSession,
                      onAgentPersonalityValueChange,
                    )
                  : renderPersonalitySliders(
                      agent,
                      traderSliderFields,
                      hasActiveSession,
                      onAgentPersonalityValueChange,
                    )}
              </div>
            </div>
          ))}
        </div>
      </CardShell>

      <div className="startup-create-row">
        {createError ? <p className="error-copy">{createError}</p> : null}
        <button
          className="action-button primary startup-create-button"
          type="button"
          disabled={isCreating || agentDrafts.length === 0}
          onClick={onCreateSession}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            rocket_launch
          </span>
          {isCreating ? 'Creating session...' : 'Create session'}
        </button>
      </div>
    </div>
  );
}

function renderPersonalitySliders<
  TField extends
    | (typeof bankerSliderFields)[number]
    | (typeof traderSliderFields)[number],
>(
  agent: AgentDraft,
  sliderFields: readonly TField[],
  hasActiveSession: boolean,
  onAgentPersonalityValueChange: (
    draftId: string,
    key: string,
    value: number,
  ) => void,
) {
  return sliderFields.map((slider) => {
    const value =
      slider.key in agent.personality
        ? Number(
            agent.personality[slider.key as keyof typeof agent.personality],
          )
        : 0;

    return (
      <label key={slider.key} className="field personality-slider-field">
        <span>
          {slider.label} <strong>{value}</strong>
        </span>
        <input
          className={
            agent.personality.kind === 'banker'
              ? 'personality-range banker'
              : 'personality-range trader'
          }
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          disabled={hasActiveSession}
          onChange={(event) =>
            onAgentPersonalityValueChange(
              agent.id,
              slider.key,
              Number.parseInt(event.target.value, 10),
            )
          }
        />
      </label>
    );
  });
}
