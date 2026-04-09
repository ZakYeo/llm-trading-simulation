import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startTransition, useEffect, useState } from 'react';

import {
  createAgentSessionEventSource,
  createGameSession,
  getGameReplay,
  getGameSession,
  orchestrateAgentRound,
  type AgentSessionEventRecord,
  type GameReplayRecord,
} from './lib/api';

const agentRoleOptions = ['banker', 'trader'] as const;

type AgentRole = (typeof agentRoleOptions)[number];

interface AgentDraft {
  id: string;
  name: string;
  role: AgentRole;
}

const defaultAgentSetup: AgentDraft[] = [
  { id: 'agent-draft-1', name: 'Banker Bot', role: 'banker' },
  { id: 'agent-draft-2', name: 'Trader Bot', role: 'trader' },
];

function formatCurrency(value: string) {
  const amount = Number.parseFloat(value);

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function getEventLabel(event: GameReplayRecord['events'][number]) {
  if (event.type === 'transfer') {
    return `${event.sourceAgentName} -> ${event.destinationAgentName}`;
  }

  if (event.type === 'custody_placement') {
    return `${event.ownerAgentName} placed funds with ${event.bankerAgentName}`;
  }

  if (event.type === 'custody_redemption') {
    return `${event.ownerAgentName} redeemed from ${event.bankerAgentName}`;
  }

  if (event.type === 'custody_accrual') {
    return `${event.ownerAgentName} accrued custody interest`;
  }

  if (event.type === 'message') {
    return event.visibility === 'private'
      ? `${event.senderAgentName} -> ${event.recipientAgentName ?? 'Unknown'}`
      : `${event.senderAgentName} broadcast`;
  }

  if (event.type === 'action') {
    if (event.actionType === 'place_funds_with_banker') {
      return `${event.agentName} / place funds with banker`;
    }

    if (event.actionType === 'redeem_funds_from_banker') {
      return `${event.agentName} / redeem funds from banker`;
    }

    return `${event.agentName} / ${event.actionType}`;
  }

  return event.agentName ?? event.type;
}

function getEventDetail(event: GameReplayRecord['events'][number]) {
  if (event.type === 'message') {
    return event.content ?? 'No content';
  }

  if (
    event.type === 'custody_placement' ||
    event.type === 'custody_redemption' ||
    event.type === 'custody_accrual'
  ) {
    return event.amount ? `Amount ${formatCurrency(event.amount)}` : null;
  }

  if (event.type === 'action') {
    if (
      event.actionType === 'send_private_message' ||
      event.actionType === 'send_public_message'
    ) {
      return null;
    }

    if (event.amount) {
      return `Amount ${formatCurrency(event.amount)}`;
    }

    return 'Action recorded';
  }

  if (event.amount) {
    return `Amount ${formatCurrency(event.amount)}`;
  }

  return 'No content';
}

export function App() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [sessionName, setSessionName] = useState('Operator Demo Table');
  const [initialBalance, setInitialBalance] = useState('100.0000');
  const [turnCount, setTurnCount] = useState(2);
  const [latestRunSummary, setLatestRunSummary] = useState('');
  const [agentDrafts, setAgentDrafts] =
    useState<AgentDraft[]>(defaultAgentSetup);
  const [nextAgentDraftId, setNextAgentDraftId] = useState(
    defaultAgentSetup.length + 1,
  );

  const sessionQuery = useQuery({
    queryKey: ['game-session', selectedSessionId],
    queryFn: () => getGameSession(selectedSessionId),
    enabled: selectedSessionId.length > 0,
  });
  const replayQuery = useQuery({
    queryKey: ['game-replay', selectedSessionId],
    queryFn: () => getGameReplay(selectedSessionId),
    enabled: selectedSessionId.length > 0,
  });

  const createSessionMutation = useMutation({
    mutationFn: () =>
      createGameSession({
        name: sessionName,
        initialBalance,
        agents: agentDrafts.map((agent) => ({
          name: agent.name,
          role: agent.role,
        })),
      }),
    onSuccess: (session) => {
      startTransition(() => {
        setSelectedSessionId(session.id);
        setLatestRunSummary(`Created session ${session.name}`);
      });
      queryClient.setQueryData(['game-session', session.id], session);
      void queryClient.invalidateQueries({
        queryKey: ['game-replay', session.id],
      });
    },
  });

  const orchestrateMutation = useMutation({
    mutationFn: () => orchestrateAgentRound(selectedSessionId, turnCount),
    onSuccess: (result) => {
      setLatestRunSummary(
        `Ran ${result.turns.length} turn${result.turns.length === 1 ? '' : 's'} for session ${result.gameSessionId}`,
      );
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['game-session', selectedSessionId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['game-replay', selectedSessionId],
        }),
      ]);
    },
  });

  const selectedSession = sessionQuery.data;
  const replay = replayQuery.data;
  const banker = selectedSession?.agents.find(
    (agent) => agent.role === 'banker',
  );
  const trader = selectedSession?.agents.find(
    (agent) => agent.role === 'trader',
  );
  const traderCustodyPosition =
    selectedSession && banker && trader
      ? selectedSession.bankerCustodyPositions.find(
          (position) =>
            position.bankerAgentId === banker.id &&
            position.ownerAgentId === trader.id,
        )
      : undefined;
  const totalCustodiedBalance =
    selectedSession?.bankerCustodyPositions.reduce(
      (total, position) => total + Number.parseFloat(position.totalBalance),
      0,
    ) ?? 0;
  const totalCustodiedInterest =
    selectedSession?.bankerCustodyPositions.reduce(
      (total, position) => total + Number.parseFloat(position.accruedInterest),
      0,
    ) ?? 0;
  const normalizedTurnCount = Number.isNaN(turnCount)
    ? 1
    : Math.min(10, Math.max(1, turnCount));
  const canRemoveAgent = agentDrafts.length > 1;

  function updateAgentDraft(
    draftId: string,
    updater: (draft: AgentDraft) => AgentDraft,
  ) {
    setAgentDrafts((current) =>
      current.map((draft) => (draft.id === draftId ? updater(draft) : draft)),
    );
  }

  function addAgentDraft() {
    const nextIndex = nextAgentDraftId;

    setAgentDrafts((current) => [
      ...current,
      {
        id: `agent-draft-${nextIndex}`,
        name: `New Bot ${nextIndex}`,
        role: 'trader',
      },
    ]);
    setNextAgentDraftId(nextIndex + 1);
  }

  function removeAgentDraft(draftId: string) {
    setAgentDrafts((current) =>
      current.length === 1
        ? current
        : current.filter((draft) => draft.id !== draftId),
    );
  }

  useEffect(() => {
    if (!selectedSessionId) {
      return undefined;
    }

    const eventSource = createAgentSessionEventSource(selectedSessionId);

    function refreshLiveState() {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['game-session', selectedSessionId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['game-replay', selectedSessionId],
        }),
      ]);
    }

    function handleActionProgressed(event: MessageEvent<string>) {
      const payload = JSON.parse(event.data) as AgentSessionEventRecord;

      setLatestRunSummary(
        `${payload.agentName ?? 'Agent'} progressed ${payload.actionType ?? 'an action'} on turn ${payload.turnNumber ?? '?'}.`,
      );
      refreshLiveState();
    }

    function handleTransferSettled(event: MessageEvent<string>) {
      const payload = JSON.parse(event.data) as AgentSessionEventRecord;

      setLatestRunSummary(
        `Transfer settled on turn ${payload.turnNumber ?? '?'} for ${payload.amount ?? '0.0000'}.`,
      );
      refreshLiveState();
    }

    function handleTurnCompleted(event: MessageEvent<string>) {
      const payload = JSON.parse(event.data) as AgentSessionEventRecord;

      setLatestRunSummary(
        `Turn ${payload.turnNumber ?? '?'} completed with ${payload.actionCount ?? 0} actions and ${payload.messageCount ?? 0} messages.`,
      );
    }

    function handleRoundCompleted(event: MessageEvent<string>) {
      const payload = JSON.parse(event.data) as AgentSessionEventRecord;

      setLatestRunSummary(
        `Round ${payload.roundNumber} finished after ${payload.turnCount ?? 0} turn${payload.turnCount === 1 ? '' : 's'}.`,
      );
      refreshLiveState();
    }

    eventSource.addEventListener(
      'action_progressed',
      handleActionProgressed as EventListener,
    );
    eventSource.addEventListener(
      'transfer_settled',
      handleTransferSettled as EventListener,
    );
    eventSource.addEventListener(
      'turn_completed',
      handleTurnCompleted as EventListener,
    );
    eventSource.addEventListener(
      'round_completed',
      handleRoundCompleted as EventListener,
    );

    return () => {
      eventSource.removeEventListener(
        'action_progressed',
        handleActionProgressed as EventListener,
      );
      eventSource.removeEventListener(
        'transfer_settled',
        handleTransferSettled as EventListener,
      );
      eventSource.removeEventListener(
        'turn_completed',
        handleTurnCompleted as EventListener,
      );
      eventSource.removeEventListener(
        'round_completed',
        handleRoundCompleted as EventListener,
      );
      eventSource.close();
    };
  }, [queryClient, selectedSessionId]);

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Frontend MVP</p>
        <h1>LLM Trading Operator Console</h1>
        <p className="lede">
          Create a session, run agent turns, inspect balances, and audit replay
          events from the backend MVP without leaving the browser.
        </p>
      </section>

      <section className="workspace-grid">
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
              onChange={(event) => setSessionName(event.target.value)}
              placeholder="Morning liquidity drill"
            />
          </label>

          <label className="field">
            <span>Initial balance</span>
            <input
              value={initialBalance}
              onChange={(event) => setInitialBalance(event.target.value)}
              placeholder="100.0000"
            />
          </label>

          <div className="agent-stack">
            <div className="agent-stack-header">
              <span>Roster</span>
              <button
                className="agent-stack-button"
                type="button"
                onClick={addAgentDraft}
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
                      updateAgentDraft(agent.id, (draft) => ({
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
                      updateAgentDraft(agent.id, (draft) => ({
                        ...draft,
                        role: event.target.value as AgentRole,
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
                  onClick={() => removeAgentDraft(agent.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            className="action-button primary"
            type="button"
            disabled={
              createSessionMutation.isPending || agentDrafts.length === 0
            }
            onClick={() => createSessionMutation.mutate()}
          >
            {createSessionMutation.isPending
              ? 'Creating session...'
              : 'Create session'}
          </button>

          <label className="field">
            <span>Active session id</span>
            <input
              value={selectedSessionId}
              onChange={(event) => setSelectedSessionId(event.target.value)}
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
                setTurnCount(Number.parseInt(event.target.value || '1', 10))
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
                  onClick={() => setTurnCount(preset)}
                >
                  {preset} turn{preset === 1 ? '' : 's'}
                </button>
              ))}
            </div>
          </div>

          <button
            className="action-button"
            type="button"
            disabled={!selectedSessionId || orchestrateMutation.isPending}
            onClick={() => orchestrateMutation.mutate()}
          >
            {orchestrateMutation.isPending
              ? `Running ${normalizedTurnCount} turn${normalizedTurnCount === 1 ? '' : 's'}...`
              : `Run next ${normalizedTurnCount} turn${normalizedTurnCount === 1 ? '' : 's'}`}
          </button>

          <div className="feedback-block">
            {latestRunSummary ? <p>{latestRunSummary}</p> : null}
            {createSessionMutation.error ? (
              <p className="error-copy">
                {createSessionMutation.error.message}
              </p>
            ) : null}
            {orchestrateMutation.error ? (
              <p className="error-copy">{orchestrateMutation.error.message}</p>
            ) : null}
          </div>
        </section>

        <section className="panel session-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">State</p>
              <h2>Session Snapshot</h2>
            </div>
            {selectedSession ? (
              <span className="status-chip muted">
                Round {selectedSession.currentRound}
              </span>
            ) : null}
          </div>

          {sessionQuery.isFetching ? <p>Loading session...</p> : null}
          {!selectedSessionId ? (
            <p className="empty-copy">
              Create a session or paste an existing session id to inspect live
              state.
            </p>
          ) : null}
          {selectedSession ? (
            <>
              <div className="session-meta">
                <div>
                  <span>Name</span>
                  <strong>{selectedSession.name}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{selectedSession.status}</strong>
                </div>
                <div>
                  <span>Session id</span>
                  <strong className="mono">{selectedSession.id}</strong>
                </div>
              </div>

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
                      <div>
                        <dt>Deposit</dt>
                        <dd>{formatCurrency(agent.depositPrincipal)}</dd>
                      </div>
                      <div>
                        <dt>Interest</dt>
                        <dd>{formatCurrency(agent.depositAccruedInterest)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>

              <section className="treasury-panel">
                <div className="treasury-header">
                  <div>
                    <p className="panel-kicker">Treasury</p>
                    <h3>Custody Overview</h3>
                  </div>
                  <span className="status-chip muted">
                    {selectedSession.bankerCustodyPositions.length} position
                    {selectedSession.bankerCustodyPositions.length === 1
                      ? ''
                      : 's'}
                  </span>
                </div>

                <div className="treasury-summary-grid">
                  <article className="treasury-stat-card">
                    <span>Total custodied</span>
                    <strong>
                      {formatCurrency(totalCustodiedBalance.toFixed(4))}
                    </strong>
                  </article>
                  <article className="treasury-stat-card">
                    <span>Accrued interest</span>
                    <strong>
                      {formatCurrency(totalCustodiedInterest.toFixed(4))}
                    </strong>
                  </article>
                  <article className="treasury-stat-card">
                    <span>Trader custody</span>
                    <strong>
                      {traderCustodyPosition
                        ? formatCurrency(traderCustodyPosition.totalBalance)
                        : formatCurrency('0.0000')}
                    </strong>
                  </article>
                </div>

                {traderCustodyPosition ? (
                  <div className="treasury-position-card">
                    <div>
                      <span>Trader principal with banker</span>
                      <strong>
                        {formatCurrency(traderCustodyPosition.principal)}
                      </strong>
                    </div>
                    <div>
                      <span>Trader accrued interest</span>
                      <strong>
                        {formatCurrency(traderCustodyPosition.accruedInterest)}
                      </strong>
                    </div>
                    <div>
                      <span>Redeemable total</span>
                      <strong>
                        {formatCurrency(traderCustodyPosition.totalBalance)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="empty-copy">
                    No trader funds are currently placed with the banker.
                  </p>
                )}
              </section>
            </>
          ) : null}
        </section>
      </section>

      <section className="panel replay-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Replay</p>
            <h2>Event Timeline</h2>
          </div>
          {replay ? (
            <span className="status-chip muted">
              {replay.events.length} events
            </span>
          ) : null}
        </div>

        {replayQuery.isFetching ? <p>Loading replay...</p> : null}
        {replay ? (
          <div className="timeline">
            {replay.events.map((event) => {
              const eventDetail = getEventDetail(event);

              return (
                <article key={event.id} className="timeline-event">
                  <div className={`event-badge event-${event.type}`}>
                    {event.type.replace(/_/gu, ' ')}
                  </div>
                  <div className="event-content">
                    <div className="event-topline">
                      <strong>{getEventLabel(event)}</strong>
                      <span>{formatTimestamp(event.createdAt)}</span>
                    </div>
                    {eventDetail ? (
                      <p className="event-detail">{eventDetail}</p>
                    ) : null}
                    <p className="event-meta">
                      Round{' '}
                      {event.roundNumber ?? selectedSession?.currentRound ?? 0}
                      {event.turnNumber ? ` / Turn ${event.turnNumber}` : ''}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty-copy">
            Replay events will appear here after the selected session has
            activity.
          </p>
        )}
      </section>
    </main>
  );
}
