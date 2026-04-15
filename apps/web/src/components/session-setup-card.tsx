import type { AgentPersonalityProfile } from '@llm-sim/shared-types';
import { useEffect, useState } from 'react';

import type { GameSessionSummary } from '../lib/api';

import { CardCollapseButton, CardHeader, CardShell } from './card-shell';

interface AgentDraft {
  id: string;
  name: string;
  role: 'banker' | 'trader';
  personality: AgentPersonalityProfile;
}

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

function createDefaultPersonality(
  role: AgentDraft['role'],
): AgentPersonalityProfile {
  if (role === 'banker') {
    return {
      kind: 'banker',
      warmth: 5,
      salesAggression: 5,
      riskDiscipline: 5,
    };
  }

  return {
    kind: 'trader',
    assertiveness: 5,
    riskAppetite: 5,
    convictionThreshold: 5,
  };
}

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
  const [expandedPersonalityDraftIds, setExpandedPersonalityDraftIds] =
    useState<string[]>([]);

  useEffect(() => {
    setExpandedPersonalityDraftIds((current) =>
      current.filter((draftId) =>
        agentDrafts.some((draft) => draft.id === draftId),
      ),
    );
  }, [agentDrafts]);

  function togglePersonalityPanel(draftId: string) {
    setExpandedPersonalityDraftIds((current) =>
      current.includes(draftId)
        ? current.filter((currentDraftId) => currentDraftId !== draftId)
        : [...current, draftId],
    );
  }

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
                  disabled={hasActiveSession}
                >
                  Add bot
                </button>
              </div>
              {agentDrafts.map((agent, index) => (
                <div key={agent.id} className="agent-editor-card">
                  <div className="agent-editor-row">
                    <label className="field compact">
                      <span>Bot {index + 1} name</span>
                      <input
                        value={agent.name}
                        disabled={hasActiveSession}
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
                        disabled={hasActiveSession}
                        onChange={(event) =>
                          onUpdateAgentDraft(agent.id, (draft) => {
                            const role = event.target
                              .value as AgentDraft['role'];

                            return {
                              ...draft,
                              role,
                              personality: createDefaultPersonality(role),
                            };
                          })
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
                      disabled={hasActiveSession || !canRemoveAgent}
                      onClick={() => onRemoveAgentDraft(agent.id)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="agent-personality-toggle-row">
                    <span className="personality-summary-label">
                      Personality
                    </span>
                    <button
                      className="ghost-button personality-toggle-button"
                      type="button"
                      onClick={() => togglePersonalityPanel(agent.id)}
                    >
                      {expandedPersonalityDraftIds.includes(agent.id)
                        ? 'Hide'
                        : hasActiveSession
                          ? 'View'
                          : 'Edit'}
                    </button>
                  </div>

                  {expandedPersonalityDraftIds.includes(agent.id) ? (
                    <div className="agent-personality-panel">
                      {agent.personality.kind === 'banker'
                        ? (() => {
                            const personality = agent.personality;

                            return bankerSliderFields.map((slider) => (
                              <label
                                key={slider.key}
                                className="field personality-slider-field"
                              >
                                <span>
                                  {slider.label}{' '}
                                  <strong>{personality[slider.key]}</strong>
                                </span>
                                <input
                                  type="range"
                                  min={0}
                                  max={10}
                                  step={1}
                                  value={personality[slider.key]}
                                  disabled={hasActiveSession}
                                  onChange={(event) =>
                                    onUpdateAgentDraft(agent.id, (draft) => ({
                                      ...draft,
                                      personality:
                                        draft.personality.kind === 'banker'
                                          ? {
                                              ...draft.personality,
                                              [slider.key]: Number.parseInt(
                                                event.target.value,
                                                10,
                                              ),
                                            }
                                          : draft.personality,
                                    }))
                                  }
                                />
                                <div className="slider-legend">
                                  <span>{slider.lowLabel}</span>
                                  <span>{slider.highLabel}</span>
                                </div>
                              </label>
                            ));
                          })()
                        : (() => {
                            const personality = agent.personality;

                            return traderSliderFields.map((slider) => (
                              <label
                                key={slider.key}
                                className="field personality-slider-field"
                              >
                                <span>
                                  {slider.label}{' '}
                                  <strong>{personality[slider.key]}</strong>
                                </span>
                                <input
                                  type="range"
                                  min={0}
                                  max={10}
                                  step={1}
                                  value={personality[slider.key]}
                                  disabled={hasActiveSession}
                                  onChange={(event) =>
                                    onUpdateAgentDraft(agent.id, (draft) => ({
                                      ...draft,
                                      personality:
                                        draft.personality.kind === 'trader'
                                          ? {
                                              ...draft.personality,
                                              [slider.key]: Number.parseInt(
                                                event.target.value,
                                                10,
                                              ),
                                            }
                                          : draft.personality,
                                    }))
                                  }
                                />
                                <div className="slider-legend">
                                  <span>{slider.lowLabel}</span>
                                  <span>{slider.highLabel}</span>
                                </div>
                              </label>
                            ));
                          })()}
                    </div>
                  ) : null}
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
