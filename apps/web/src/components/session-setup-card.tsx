import type { AgentDraft } from '../features/session-setup/model/agent-drafts';

const bankerSliderFields = [
  { key: 'warmth', label: 'Warmth' },
  { key: 'salesAggression', label: 'Sales aggression' },
  { key: 'riskDiscipline', label: 'Risk discipline' },
] as const;
const traderSliderFields = [
  { key: 'assertiveness', label: 'Assertiveness' },
  { key: 'riskAppetite', label: 'Risk appetite' },
  { key: 'convictionThreshold', label: 'Conviction threshold' },
] as const;

interface SessionSetupCardProps {
  mode: 'expanded' | 'collapsed';
  hasActiveSession: boolean;
  selectedSessionId: string;
  selectedSessionName?: string;
  availableSessions: Array<{ value: string; label: string }>;
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

export function SessionSetupCard(props: SessionSetupCardProps) {
  if (props.mode === 'collapsed')
    return (
      <div className="startup-strip">
        <div className="startup-strip-row">
          <span className="session-caption">
            Connected to {props.selectedSessionName ?? 'your session'}
          </span>
          <div className="startup-strip-actions">
            <button
              className="quiet-button"
              type="button"
              onClick={props.onShowStartupForm}
            >
              Change session
            </button>
            <button
              className="quiet-button"
              type="button"
              onClick={props.onStartNewSession}
            >
              New session +
            </button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="session-startup-card">
      {props.hasActiveSession && (
        <div className="startup-active-row">
          <h2>Session settings</h2>
          <button
            type="button"
            className="quiet-button"
            onClick={props.onHideStartupForm}
          >
            Back to simulation
          </button>
        </div>
      )}
      <section className="connect-section">
        <div>
          <h2>Pick up where you left off</h2>
          <p>Open a saved session to continue the conversation.</p>
        </div>
        <label className="field">
          <span>Connect to session</span>
          <select
            value={props.selectedSessionId}
            onChange={(event) =>
              props.onSelectedSessionIdChange(event.target.value)
            }
          >
            <option value="">Select a saved session</option>
            {props.availableSessions.map((session) => (
              <option key={session.value} value={session.value}>
                {session.label}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section className="setup-section">
        <div className="setup-section-heading">
          <span className="step-number" aria-hidden="true">
            01
          </span>
          <div>
            <h2>Set the starting conditions</h2>
            <p>Every agent starts with the same available balance.</p>
          </div>
        </div>
        <div className="startup-parameter-grid">
          <label className="field startup-field-full">
            <span>Session name</span>
            <input
              value={props.sessionName}
              onChange={(event) =>
                props.onSessionNameChange(event.target.value)
              }
              placeholder="Morning liquidity drill"
            />
          </label>
          <label className="field">
            <span>Initial balance (SIM)</span>
            <input
              value={props.initialBalance}
              onChange={(event) =>
                props.onInitialBalanceChange(event.target.value)
              }
              placeholder="100.0000"
            />
          </label>
          <label className="field">
            <span>Treasury interest per round (bps)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={props.interestRateBps}
              onChange={(event) =>
                props.onInterestRateBpsChange(event.target.value)
              }
            />
          </label>
        </div>
        <p className="field-note">
          The interest rate is applied when you advance a round, not when you
          create the session.
        </p>
      </section>
      <section className="setup-section">
        <div className="startup-roster-header">
          <div className="setup-section-heading">
            <span className="step-number" aria-hidden="true">
              02
            </span>
            <div>
              <h2>Meet your agents</h2>
              <p>Choose their roles. Adjust their personalities if you like.</p>
            </div>
          </div>
          <button
            type="button"
            className="ghost-button"
            disabled={props.hasActiveSession}
            onClick={props.onAddAgentDraft}
          >
            Add agent
          </button>
        </div>
        <div className="startup-agent-grid">
          {props.agentDrafts.map((agent, index) => (
            <article className="startup-agent-card" key={agent.id}>
              <div className="section-heading">
                <span className="agent-number">
                  Agent {String(index + 1).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  className="quiet-button"
                  aria-label={`Remove ${agent.name}`}
                  disabled={props.hasActiveSession || !props.canRemoveAgent}
                  onClick={() => props.onRemoveAgentDraft(agent.id)}
                >
                  Remove
                </button>
              </div>
              <label className="field">
                <span>Agent name</span>
                <input
                  aria-label={`${agent.name} name`}
                  value={agent.name}
                  disabled={props.hasActiveSession}
                  onChange={(event) =>
                    props.onAgentNameChange(agent.id, event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Role</span>
                <select
                  aria-label={`${agent.name} role`}
                  value={agent.role}
                  disabled={props.hasActiveSession}
                  onChange={(event) =>
                    props.onAgentRoleChange(
                      agent.id,
                      event.target.value as AgentDraft['role'],
                    )
                  }
                >
                  <option value="banker">Banker</option>
                  <option value="trader">Trader</option>
                </select>
              </label>
              <details className="personality-disclosure">
                <summary>Customize {agent.name} personality</summary>
                <div className="startup-personality-grid">
                  {renderPersonalitySliders(
                    agent,
                    agent.personality.kind === 'banker'
                      ? bankerSliderFields
                      : traderSliderFields,
                    props.hasActiveSession,
                    props.onAgentPersonalityValueChange,
                  )}
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>
      <div className="startup-create-row">
        {props.createError && (
          <p className="error-copy" role="alert">
            {props.createError}
          </p>
        )}
        <p className="field-note">
          Your agents will negotiate independently. You control the pace.
        </p>
        <button
          type="button"
          className="action-button primary"
          disabled={props.isCreating || props.agentDrafts.length === 0}
          onClick={props.onCreateSession}
        >
          {props.isCreating ? 'Creating session…' : 'Create session'}
        </button>
      </div>
    </div>
  );
}
function renderPersonalitySliders(
  agent: AgentDraft,
  fields: readonly { key: string; label: string }[],
  disabled: boolean,
  onChange: SessionSetupCardProps['onAgentPersonalityValueChange'],
) {
  return fields.map((field) => (
    <label key={field.key} className="field">
      <span>
        {field.label}{' '}
        <strong>
          {Number(
            agent.personality[field.key as keyof typeof agent.personality],
          )}
        </strong>
      </span>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={Number(
          agent.personality[field.key as keyof typeof agent.personality],
        )}
        disabled={disabled}
        onChange={(event) =>
          onChange(agent.id, field.key, Number.parseInt(event.target.value, 10))
        }
      />
      <span className="slider-scale">
        <span>0</span>
        <span>10</span>
      </span>
    </label>
  ));
}
