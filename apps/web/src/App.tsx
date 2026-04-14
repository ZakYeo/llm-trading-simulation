import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startTransition, useState } from 'react';

import { AuditTrailCard } from './components/audit-trail-card';
import { BalancesCard } from './components/balances-card';
import { MarketVisibilityCard } from './components/market-visibility-card';
import { OperateCard } from './components/operate-card';
import { SessionOverviewCard } from './components/session-overview-card';
import { SessionSetupCard } from './components/session-setup-card';
import { TreasuryCard } from './components/treasury-card';
import {
  advanceGameRound,
  createGameSession,
  getGameReplay,
  getGameSession,
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
      void queryClient.invalidateQueries({
        queryKey: ['game-replay', selectedSessionId],
      });
    },
  });

  const selectedSession = sessionQuery.data;
  const replay = replayQuery.data;
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

  useSessionEvents({
    queryClient,
    selectedSessionId,
    setLatestRunSummary,
  });

  return (
    <main className="app-shell">
      <section className="topbar panel">
        <div className="topbar-copy">
          <p className="eyebrow">Operator Console</p>
          <h1>LLM Trading Simulator</h1>
          <p className="lede">
            A browser-based control room for creating simulated agent sessions,
            running negotiation rounds, tracking balances, and reviewing replay
            history in one place.
          </p>
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

          <div className="topbar-metrics">
            <article className="topbar-metric">
              <span>Session</span>
              <strong>{selectedSession?.name ?? 'No session connected'}</strong>
            </article>
            <article className="topbar-metric">
              <span>Round</span>
              <strong>{selectedSession?.currentRound ?? 0}</strong>
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
        </div>
      </section>

      <section className="dashboard-grid">
        <aside className="control-rail">
          <SessionSetupCard
            selectedSessionId={selectedSessionId}
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
            onSelectedSessionIdChange={setSelectedSessionId}
            onAddAgentDraft={addAgentDraft}
            onRemoveAgentDraft={removeAgentDraft}
            onUpdateAgentDraft={updateAgentDraft}
            onCreateSession={() => createSessionMutation.mutate()}
          />

          <OperateCard
            selectedSessionId={selectedSessionId}
            currentRound={selectedSession?.currentRound}
            turnCount={turnCount}
            latestRunSummary={latestRunSummary}
            isRunning={orchestrateMutation.isPending}
            isAdvancing={advanceRoundMutation.isPending}
            runError={orchestrateMutation.error?.message}
            advanceError={advanceRoundMutation.error?.message}
            onTurnCountChange={setTurnCount}
            onRunTurns={() => orchestrateMutation.mutate()}
            onAdvanceRound={() => advanceRoundMutation.mutate()}
          />
        </aside>

        <div className="workspace-column">
          <SessionOverviewCard
            selectedSessionId={selectedSessionId}
            selectedSession={selectedSession}
            isFetching={sessionQuery.isFetching}
          />
          <BalancesCard selectedSession={selectedSession} />
          <TreasuryCard selectedSession={selectedSession} />
          <MarketVisibilityCard selectedSession={selectedSession} />
          <AuditTrailCard
            replay={replay}
            selectedRound={selectedSession?.currentRound}
            isFetching={replayQuery.isFetching}
          />
        </div>
      </section>

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
                  Use Session Setup to create a new simulation or load an
                  existing session id.
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
                  Use the workspace to review session state, agent balances, and
                  treasury exposure at a glance.
                </p>
              </article>
              <article className="help-card">
                <strong>5. Audit history</strong>
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
