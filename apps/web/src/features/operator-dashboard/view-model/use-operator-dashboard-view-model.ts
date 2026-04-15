import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { startTransition, useEffect, useRef, useState } from 'react';

import {
  advanceGameRound,
  createGameSession,
  getGameReplay,
  getGameSession,
  listGameSessions,
  orchestrateAgentRound,
} from '../../../lib/api';
import {
  useSessionEvents,
  type StreamedAuditMessageRecord,
} from '../../audit-trail/view-model/use-session-events';
import {
  createBalanceAccounts,
  createMarketVisibilityViewData,
  createTreasuryViewData,
} from '../../session-overview/model/session-overview';
import {
  createDefaultPersonality,
  defaultAgentSetup,
  toAgentDrafts,
  type AgentDraft,
} from '../../session-setup/model/agent-drafts';

interface DashboardCardViewModel {
  className: string;
  style: CSSProperties;
}

export function useOperatorDashboardViewModel() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [sessionName, setSessionName] = useState('Operator Demo Table');
  const [initialBalance, setInitialBalance] = useState('100.0000');
  const [turnCount, setTurnCount] = useState(2);
  const [interestRateBps, setInterestRateBps] = useState('250');
  const [latestRunSummary, setLatestRunSummary] = useState('');
  const [streamedMessages, setStreamedMessages] = useState<
    StreamedAuditMessageRecord[]
  >([]);
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
          personality: agent.personality,
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
      return;
    }

    setAgentDrafts(toAgentDrafts(selectedSession));
    setNextAgentDraftId(selectedSession.agents.length + 1);
  }, [selectedSession]);

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
        personality: createDefaultPersonality('trader'),
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

  function createDashboardCardViewModel(delay: string): DashboardCardViewModel {
    return {
      className: shouldAnimateSessionCards
        ? 'dashboard-card session-card-enter'
        : 'dashboard-card',
      style: { '--card-enter-delay': delay } as CSSProperties,
    };
  }

  useSessionEvents({
    queryClient,
    replay,
    selectedSessionId,
    setLatestRunSummary,
    setStreamedMessages,
  });
  const sessionSetupMode: 'collapsed' | 'expanded' =
    hasSelectedSession && !isStartupVisible ? 'collapsed' : 'expanded';

  return {
    topbar: {
      hasSelectedSession,
      shouldShowHeaderMetrics,
      shouldAnimateHeaderMetrics,
      selectedSessionName: selectedSession?.name,
      currentRound: selectedSession?.currentRound ?? 1,
      status: selectedSession?.status ?? 'setup',
      latestRunSummary,
      openHelp: () => setIsHelpOpen(true),
    },
    sessionSetup: {
      mode: sessionSetupMode,
      hasActiveSession: hasSelectedSession,
      selectedSessionId,
      selectedSessionName: selectedSession?.name,
      availableSessions: sessionsQuery.data ?? [],
      sessionName,
      initialBalance,
      interestRateBps,
      agentDrafts,
      canRemoveAgent,
      isCreating: createSessionMutation.isPending,
      createError: createSessionMutation.error?.message,
      onSessionNameChange: setSessionName,
      onInitialBalanceChange: setInitialBalance,
      onInterestRateBpsChange: setInterestRateBps,
      onSelectedSessionIdChange: handleSelectedSessionIdChange,
      onAddAgentDraft: addAgentDraft,
      onRemoveAgentDraft: removeAgentDraft,
      onUpdateAgentDraft: updateAgentDraft,
      onCreateSession: () => createSessionMutation.mutate(),
      onShowStartupForm: showStartupForm,
      onHideStartupForm: hideStartupForm,
      onStartNewSession: startNewSessionFlow,
    },
    workspace: {
      isVisible: hasSelectedSession,
      operate: {
        selectedSessionId,
        currentRound: selectedSession?.currentRound,
        turnCount,
        isRunning: orchestrateMutation.isPending,
        isAdvancing: advanceRoundMutation.isPending,
        runError: orchestrateMutation.error?.message,
        advanceError: advanceRoundMutation.error?.message,
        onTurnCountChange: setTurnCount,
        onRunTurns: () => orchestrateMutation.mutate(),
        onAdvanceRound: () => advanceRoundMutation.mutate(),
      },
      auditTrail: {
        replay,
        streamedMessages,
        selectedRound: selectedSession?.currentRound,
        isFetching: replayQuery.isFetching,
        isTurnFlowInProgress,
        inProgressLabel,
        latestRunSummary,
      },
      balanceAccounts: createBalanceAccounts(selectedSession),
      treasury: createTreasuryViewData(selectedSession),
      market: createMarketVisibilityViewData(selectedSession),
      cards: {
        operate: createDashboardCardViewModel('0ms'),
        auditTrail: createDashboardCardViewModel('160ms'),
        balances: createDashboardCardViewModel('320ms'),
        treasury: createDashboardCardViewModel('480ms'),
        market: createDashboardCardViewModel('640ms'),
      },
    },
    helpModal: {
      isOpen: isHelpOpen,
      onClose: () => setIsHelpOpen(false),
    },
  };
}
