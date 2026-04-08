import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startTransition, useState } from 'react';

import {
  createGameSession,
  getGameReplay,
  getGameSession,
  orchestrateAgentRound,
  type GameReplayRecord,
} from './lib/api';

const defaultAgentSetup = [
  { name: 'Banker Bot', role: 'banker' },
  { name: 'Analyst Bot', role: 'analyst' },
  { name: 'Lawyer Bot', role: 'lawyer' },
  { name: 'Influencer Bot', role: 'influencer' },
  { name: 'Trader Bot', role: 'trader' },
] as const;

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

  if (event.type === 'message') {
    return event.visibility === 'private'
      ? `${event.senderAgentName} -> ${event.recipientAgentName ?? 'Unknown'}`
      : `${event.senderAgentName} broadcast`;
  }

  if (event.type === 'action') {
    return `${event.agentName} / ${event.actionType}`;
  }

  return event.agentName ?? event.type;
}

export function App() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [sessionName, setSessionName] = useState('Operator Demo Table');
  const [initialBalance, setInitialBalance] = useState('100.0000');
  const [turnCount, setTurnCount] = useState(2);
  const [latestRunSummary, setLatestRunSummary] = useState('');

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
        agents: defaultAgentSetup.map((agent) => ({ ...agent })),
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
  const normalizedTurnCount = Number.isNaN(turnCount)
    ? 1
    : Math.min(10, Math.max(1, turnCount));

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
            {defaultAgentSetup.map((agent) => (
              <div key={agent.role} className="agent-row">
                <strong>{agent.name}</strong>
                <span>{agent.role}</span>
              </div>
            ))}
          </div>

          <button
            className="action-button primary"
            type="button"
            disabled={createSessionMutation.isPending}
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
            {replay.events.map((event) => (
              <article key={event.id} className="timeline-event">
                <div className={`event-badge event-${event.type}`}>
                  {event.type}
                </div>
                <div className="event-content">
                  <div className="event-topline">
                    <strong>{getEventLabel(event)}</strong>
                    <span>{formatTimestamp(event.createdAt)}</span>
                  </div>
                  <p className="event-detail">
                    {event.content ??
                      (event.amount
                        ? `Amount ${formatCurrency(event.amount)}`
                        : 'No content')}
                  </p>
                  <p className="event-meta">
                    Round{' '}
                    {event.roundNumber ?? selectedSession?.currentRound ?? 0}
                    {event.turnNumber ? ` / Turn ${event.turnNumber}` : ''}
                  </p>
                </div>
              </article>
            ))}
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
