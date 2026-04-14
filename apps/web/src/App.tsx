import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { startTransition, useEffect, useRef, useState } from 'react';

import { AuditTrailCard } from './components/audit-trail-card';
import { BalancesCard } from './components/balances-card';
import { MarketVisibilityCard } from './components/market-visibility-card';
import { OperateCard } from './components/operate-card';
import { SessionSetupCard } from './components/session-setup-card';
import { TreasuryCard } from './components/treasury-card';
import {
  advanceGameRound,
  createGameSession,
  getGameReplay,
  getGameSession,
  listGameSessions,
  orchestrateAgentRound,
} from './lib/api';
import { useSessionEvents } from './hooks/use-session-events';

type AgentRole = 'banker' | 'trader';

interface AgentDraft {
  id: string;
  name: string;
  role: AgentRole;
}

const defaultAgentSetup: AgentDraft[] = [
  { id: 'agent-draft-1', name: 'Banker Bot', role: 'banker' },
  { id: 'agent-draft-2', name: 'Trader Bot', role: 'trader' },
];

export function App() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [sessionName, setSessionName] = useState('Operator Demo Table');
  const [initialBalance, setInitialBalance] = useState('100.0000');
  const [turnCount, setTurnCount] = useState(2);
  const [interestRateBps, setInterestRateBps] = useState('250');
  const [latestRunSummary, setLatestRunSummary] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [agentDrafts, setAgentDrafts] =
    useState<AgentDraft[]>(defaultAgentSetup);
  const [nextAgentDraftId, setNextAgentDraftId] = useState(
    defaultAgentSetup.length + 1,
  );
  const [isStartupVisible, setIsStartupVisible] = useState(true);
  const [revealedSessionId, setRevealedSessionId] = useState<string | null>(
    null,
  );
  const [revealedHeaderSessionId, setRevealedHeaderSessionId] = useState<
    string | null
  >(null);
  const previousVisibleSessionId = useRef<string | null>(null);

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
  const sessionsQuery = useQuery({
    queryKey: ['game-sessions'],
    queryFn: listGameSessions,
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
        setIsStartupVisible(false);
      });
      queryClient.setQueryData(
        ['game-sessions'],
        (current: typeof sessionsQuery.data = []) => [
          {
            id: session.id,
            name: session.name,
            status: session.status,
            currentRound: session.currentRound,
          },
          ...current.filter((existing) => existing.id !== session.id),
        ],
      );
      queryClient.setQueryData(['game-session', session.id], session);
      void queryClient.invalidateQueries({
        queryKey: ['game-replay', session.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ['game-sessions'],
      });
    },
  });

  const parsedInterestRateBps = Number.parseInt(interestRateBps, 10);
  const roundInterestRateBps =
    interestRateBps.trim().length === 0 || Number.isNaN(parsedInterestRateBps)
      ? undefined
      : parsedInterestRateBps;

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
        queryClient.invalidateQueries({
          queryKey: ['game-sessions'],
        }),
      ]);
    },
  });

  const advanceRoundMutation = useMutation({
    mutationFn: () => advanceGameRound(selectedSessionId, roundInterestRateBps),
    onSuccess: (session) => {
      setLatestRunSummary(
        `Advanced to round ${session.currentRound} with ${roundInterestRateBps ?? 'default'} bps custody interest`,
      );
      queryClient.setQueryData(['game-session', session.id], session);
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['game-replay', selectedSessionId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['game-sessions'],
        }),
      ]);
    },
  });

  const selectedSession = sessionQuery.data;
  const replay = replayQuery.data;
  const hasSelectedSession = selectedSessionId.length > 0;
  const shouldShowHeaderMetrics = Boolean(selectedSession);
  const canRemoveAgent = agentDrafts.length > 1;
  const isTurnFlowInProgress =
    orchestrateMutation.isPending || advanceRoundMutation.isPending;
  const inProgressLabel = orchestrateMutation.isPending
    ? `Running ${turnCount} turn${turnCount === 1 ? '' : 's'}...`
    : advanceRoundMutation.isPending
      ? 'Applying round settlement...'
      : '';
  const shouldAnimateSessionCards = selectedSession?.id === revealedSessionId;
  const shouldAnimateHeaderMetrics =
    selectedSession?.id === revealedHeaderSessionId;

  function handleSelectedSessionIdChange(value: string) {
    setSelectedSessionId(value);
    setIsStartupVisible(value.length === 0);
  }

  function showStartupForm() {
    setIsStartupVisible(true);
  }

  function hideStartupForm() {
    setIsStartupVisible(false);
  }

  function startNewSessionFlow() {
    setSelectedSessionId('');
    setIsStartupVisible(true);
  }

  useEffect(() => {
    if (!selectedSession) {
      previousVisibleSessionId.current = null;
      setRevealedSessionId(null);
      setRevealedHeaderSessionId(null);
      return;
    }

    if (previousVisibleSessionId.current === selectedSession.id) {
      return;
    }

    previousVisibleSessionId.current = selectedSession.id;
    setRevealedSessionId(selectedSession.id);
    setRevealedHeaderSessionId(selectedSession.id);

    const workspaceTimer = window.setTimeout(() => {
      setRevealedSessionId((current) =>
        current === selectedSession.id ? null : current,
      );
    }, 1250);
    const headerTimer = window.setTimeout(() => {
      setRevealedHeaderSessionId((current) =>
        current === selectedSession.id ? null : current,
      );
    }, 980);

    return () => {
      window.clearTimeout(workspaceTimer);
      window.clearTimeout(headerTimer);
    };
  }, [selectedSession]);

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

  useSessionEvents({
    queryClient,
    selectedSessionId,
    setLatestRunSummary,
  });

  return (
    <main className="app-shell">
      <section
        className={
          hasSelectedSession ? 'topbar panel topbar-connected' : 'topbar panel'
        }
      >
        <div className="topbar-copy">
          <p className="eyebrow">Operator Console</p>
          <h1>LLM Trading Simulator</h1>
          {!hasSelectedSession ? (
            <p className="lede">
              Create a session or reconnect to an existing one, then open the
              operator workspace once the simulation is live.
            </p>
          ) : null}
        </div>

        <div className="topbar-side">
          <div className="topbar-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => setIsHelpOpen(true)}
            >
              Help
            </button>
          </div>

          {shouldShowHeaderMetrics ? (
            <div
              className={
                shouldAnimateHeaderMetrics
                  ? 'topbar-metrics topbar-metrics-enter'
                  : 'topbar-metrics'
              }
            >
              <article className="topbar-metric">
                <span>Session</span>
                <strong>
                  {selectedSession?.name ?? 'No session connected'}
                </strong>
              </article>
              <article className="topbar-metric">
                <span>Round</span>
                <strong>{selectedSession?.currentRound ?? 1}</strong>
              </article>
              <article className="topbar-metric">
                <span>Status</span>
                <strong>{selectedSession?.status ?? 'setup'}</strong>
              </article>
              <article className="topbar-metric highlight">
                <span>Latest activity</span>
                <strong>{latestRunSummary || 'Awaiting operator input'}</strong>
              </article>
            </div>
          ) : null}
        </div>
      </section>

      {!hasSelectedSession ? (
        <section className="startup-shell">
          <SessionSetupCard
            mode="expanded"
            hasActiveSession={false}
            selectedSessionId={selectedSessionId}
            selectedSessionName={selectedSession?.name}
            availableSessions={sessionsQuery.data ?? []}
            sessionName={sessionName}
            initialBalance={initialBalance}
            interestRateBps={interestRateBps}
            agentDrafts={agentDrafts}
            canRemoveAgent={canRemoveAgent}
            isCreating={createSessionMutation.isPending}
            createError={createSessionMutation.error?.message}
            onSessionNameChange={setSessionName}
            onInitialBalanceChange={setInitialBalance}
            onInterestRateBpsChange={setInterestRateBps}
            onSelectedSessionIdChange={handleSelectedSessionIdChange}
            onAddAgentDraft={addAgentDraft}
            onRemoveAgentDraft={removeAgentDraft}
            onUpdateAgentDraft={updateAgentDraft}
            onCreateSession={() => createSessionMutation.mutate()}
            onShowStartupForm={showStartupForm}
            onHideStartupForm={hideStartupForm}
            onStartNewSession={startNewSessionFlow}
          />
        </section>
      ) : (
        <section className="connected-shell">
          <SessionSetupCard
            mode={isStartupVisible ? 'expanded' : 'collapsed'}
            hasActiveSession
            selectedSessionId={selectedSessionId}
            selectedSessionName={selectedSession?.name}
            availableSessions={sessionsQuery.data ?? []}
            sessionName={sessionName}
            initialBalance={initialBalance}
            interestRateBps={interestRateBps}
            agentDrafts={agentDrafts}
            canRemoveAgent={canRemoveAgent}
            isCreating={createSessionMutation.isPending}
            createError={createSessionMutation.error?.message}
            onSessionNameChange={setSessionName}
            onInitialBalanceChange={setInitialBalance}
            onInterestRateBpsChange={setInterestRateBps}
            onSelectedSessionIdChange={handleSelectedSessionIdChange}
            onAddAgentDraft={addAgentDraft}
            onRemoveAgentDraft={removeAgentDraft}
            onUpdateAgentDraft={updateAgentDraft}
            onCreateSession={() => createSessionMutation.mutate()}
            onShowStartupForm={showStartupForm}
            onHideStartupForm={hideStartupForm}
            onStartNewSession={startNewSessionFlow}
          />

          <div className="connected-workspace">
            <div className="workspace-main-lane">
              <div
                className={
                  shouldAnimateSessionCards
                    ? 'dashboard-card session-card-enter'
                    : 'dashboard-card'
                }
                style={{ '--card-enter-delay': '0ms' } as CSSProperties}
              >
                <OperateCard
                  selectedSessionId={selectedSessionId}
                  currentRound={selectedSession?.currentRound}
                  turnCount={turnCount}
                  isRunning={orchestrateMutation.isPending}
                  isAdvancing={advanceRoundMutation.isPending}
                  runError={orchestrateMutation.error?.message}
                  advanceError={advanceRoundMutation.error?.message}
                  onTurnCountChange={setTurnCount}
                  onRunTurns={() => orchestrateMutation.mutate()}
                  onAdvanceRound={() => advanceRoundMutation.mutate()}
                />
              </div>
              <div
                className={
                  shouldAnimateSessionCards
                    ? 'dashboard-card session-card-enter'
                    : 'dashboard-card'
                }
                style={{ '--card-enter-delay': '160ms' } as CSSProperties}
              >
                <AuditTrailCard
                  replay={replay}
                  selectedRound={selectedSession?.currentRound}
                  isFetching={replayQuery.isFetching}
                  isTurnFlowInProgress={isTurnFlowInProgress}
                  inProgressLabel={inProgressLabel}
                  latestRunSummary={latestRunSummary}
                />
              </div>
            </div>

            <aside className="workspace-side-lane">
              <div
                className={
                  shouldAnimateSessionCards
                    ? 'dashboard-card session-card-enter'
                    : 'dashboard-card'
                }
                style={{ '--card-enter-delay': '320ms' } as CSSProperties}
              >
                <BalancesCard
                  selectedSession={selectedSession}
                  variant="compact"
                />
              </div>
              <div
                className={
                  shouldAnimateSessionCards
                    ? 'dashboard-card session-card-enter'
                    : 'dashboard-card'
                }
                style={{ '--card-enter-delay': '480ms' } as CSSProperties}
              >
                <TreasuryCard
                  selectedSession={selectedSession}
                  variant="compact"
                />
              </div>
              <div
                className={
                  shouldAnimateSessionCards
                    ? 'dashboard-card session-card-enter'
                    : 'dashboard-card'
                }
                style={{ '--card-enter-delay': '640ms' } as CSSProperties}
              >
                <MarketVisibilityCard
                  selectedSession={selectedSession}
                  variant="compact"
                />
              </div>
            </aside>
          </div>
        </section>
      )}

      {isHelpOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setIsHelpOpen(false)}
        >
          <section
            className="help-modal panel"
            role="dialog"
            aria-modal="true"
            aria-label="Help and usage guide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Help</p>
                <h2>How To Use The Dashboard</h2>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => setIsHelpOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="help-grid">
              <article className="help-card">
                <strong>1. Create or connect</strong>
                <p>
                  Use Session Startup to create a new simulation or connect to a
                  saved session from the dropdown list.
                </p>
              </article>
              <article className="help-card">
                <strong>2. Run the session</strong>
                <p>
                  Choose a turn count, run the next turns, and watch balances,
                  status, and replay update.
                </p>
              </article>
              <article className="help-card">
                <strong>3. Settle rounds</strong>
                <p>
                  Advance the round when you want the backend custody interest
                  policy applied.
                </p>
              </article>
              <article className="help-card">
                <strong>4. Inspect state</strong>
                <p>
                  Use the connected workspace to review balances, custody,
                  market exposure, and the audit trail in one place.
                </p>
              </article>
              <article className="help-card">
                <strong>5. Custody overview</strong>
                <p>
                  Custody Overview shows banker-led custody totals, principal,
                  accrued interest, and the trader&apos;s currently redeemable
                  balance with the banker.
                </p>
              </article>
              <article className="help-card">
                <strong>6. Market visibility</strong>
                <p>
                  Market Visibility shows the current opportunity board and any
                  trader market positions that are still shaping session
                  exposure.
                </p>
              </article>
              <article className="help-card">
                <strong>7. Audit history</strong>
                <p>
                  Filter the Audit Trail by treasury, messages, actions, or
                  transfers, and limit the view to recent events when the log
                  grows.
                </p>
              </article>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
