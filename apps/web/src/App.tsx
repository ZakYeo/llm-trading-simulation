import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startTransition, useState } from 'react';

import { ReplayTimeline } from './components/replay-timeline';
import { SessionControls } from './components/session-controls';
import { SessionSnapshot } from './components/session-snapshot';
import {
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
      <section className="hero">
        <p className="eyebrow">Frontend MVP</p>
        <h1>LLM Trading Operator Console</h1>
        <p className="lede">
          Create a session, run agent turns, inspect balances, and audit replay
          events from the backend MVP without leaving the browser.
        </p>
      </section>

      <section className="workspace-grid">
        <SessionControls
          selectedSessionId={selectedSessionId}
          sessionName={sessionName}
          initialBalance={initialBalance}
          turnCount={turnCount}
          latestRunSummary={latestRunSummary}
          agentDrafts={agentDrafts}
          canRemoveAgent={canRemoveAgent}
          isCreating={createSessionMutation.isPending}
          isRunning={orchestrateMutation.isPending}
          createError={createSessionMutation.error?.message}
          runError={orchestrateMutation.error?.message}
          onSessionNameChange={setSessionName}
          onInitialBalanceChange={setInitialBalance}
          onSelectedSessionIdChange={setSelectedSessionId}
          onTurnCountChange={setTurnCount}
          onAddAgentDraft={addAgentDraft}
          onRemoveAgentDraft={removeAgentDraft}
          onUpdateAgentDraft={updateAgentDraft}
          onCreateSession={() => createSessionMutation.mutate()}
          onRunTurns={() => orchestrateMutation.mutate()}
        />

        <SessionSnapshot
          selectedSessionId={selectedSessionId}
          selectedSession={selectedSession}
          isFetching={sessionQuery.isFetching}
        />
      </section>

      <ReplayTimeline
        replay={replay}
        selectedRound={selectedSession?.currentRound}
        isFetching={replayQuery.isFetching}
      />
    </main>
  );
}
