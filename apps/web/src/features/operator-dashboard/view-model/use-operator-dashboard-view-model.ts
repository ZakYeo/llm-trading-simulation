import { useWorkspaceNavigation } from './use-workspace-navigation';
import { useSimulationJournal } from '../../audit-trail/view-model/use-simulation-journal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startTransition, useState } from 'react';

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
import { useAuditTrailViewModel } from '../../audit-trail/view-model/use-audit-trail-view-model';
import {
  createBalanceAccounts,
  createMarketVisibilityViewData,
  createTreasuryViewData,
} from '../../session-overview/model/session-overview';
import { useAgentDrafts } from '../../session-setup/view-model/use-agent-drafts';

export function useOperatorDashboardViewModel() {
  const queryClient = useQueryClient();
  const navigation = useWorkspaceNavigation();
  const selectedSessionId = navigation.sessionId;
  const setSelectedSessionId = navigation.connect;
  const [sessionName, setSessionName] = useState('Operator Demo Table');
  const [initialBalance, setInitialBalance] = useState('100.0000');
  const [turnCount, setTurnCount] = useState(2);
  const [interestRateBps, setInterestRateBps] = useState('250');
  const [latestRunSummary, setLatestRunSummary] = useState('');
  const [streamedMessages, setStreamedMessages] = useState<
    StreamedAuditMessageRecord[]
  >([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isStartupVisible, setIsStartupVisible] = useState(!selectedSessionId);

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

  const {
    agentDrafts,
    canRemoveAgent,
    updateAgentDraftName,
    updateAgentDraftRole,
    updateAgentDraftPersonalityValue,
    addAgentDraft,
    removeAgentDraft,
  } = useAgentDrafts(sessionQuery.data);

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
  const isTurnFlowInProgress =
    orchestrateMutation.isPending || advanceRoundMutation.isPending;
  const inProgressLabel = orchestrateMutation.isPending
    ? `Running ${turnCount} turn${turnCount === 1 ? '' : 's'}...`
    : advanceRoundMutation.isPending
      ? 'Applying round settlement...'
      : '';

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

  useSessionEvents({
    queryClient,
    replay,
    selectedSessionId,
    setLatestRunSummary,
    setStreamedMessages,
  });
  const auditTrailViewModel = useAuditTrailViewModel({
    isActive: hasSelectedSession,
    replay,
    streamedMessages,
    selectedRound: selectedSession?.currentRound,
  });
  const journal = useSimulationJournal({
    replay,
    streamedMessages,
    selectedRound: selectedSession?.currentRound,
    sessionId: selectedSessionId,
  });
  const sessionSetupMode: 'collapsed' | 'expanded' =
    hasSelectedSession && !isStartupVisible ? 'collapsed' : 'expanded';

  return {
    navigation,
    topbar: {
      hasSelectedSession,
      shouldShowHeaderMetrics,
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
      availableSessions: (sessionsQuery.data ?? []).map((session) => ({
        value: session.id,
        label: `${session.name} (${session.id})`,
      })),
      sessionName,
      initialBalance,
      interestRateBps,
      agentDrafts,
      canRemoveAgent,
      isLoadingSessions: sessionsQuery.isPending,
      isCreating: createSessionMutation.isPending,
      createError: createSessionMutation.error?.message,
      sessionsError: sessionsQuery.error?.message,
      onSessionNameChange: setSessionName,
      onInitialBalanceChange: setInitialBalance,
      onInterestRateBpsChange: setInterestRateBps,
      onSelectedSessionIdChange: handleSelectedSessionIdChange,
      onAddAgentDraft: addAgentDraft,
      onRemoveAgentDraft: removeAgentDraft,
      onAgentNameChange: updateAgentDraftName,
      onAgentRoleChange: updateAgentDraftRole,
      onAgentPersonalityValueChange: updateAgentDraftPersonalityValue,
      onCreateSession: () => createSessionMutation.mutate(),
      onShowStartupForm: showStartupForm,
      onHideStartupForm: hideStartupForm,
      onStartNewSession: startNewSessionFlow,
    },
    workspace: {
      isVisible: hasSelectedSession,
      isLoading: sessionQuery.isPending,
      isLoadingReplay: replayQuery.isPending,
      loadError: sessionQuery.error?.message,
      replayError: replayQuery.error?.message,
      operate: {
        interestRateBps,
        onInterestRateBpsChange: setInterestRateBps,
        selectedSessionId: selectedSession?.id ?? '',
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
      journal,
      auditTrail: {
        viewModel: auditTrailViewModel,
        isLoading: replayQuery.isPending,
        isFetching: replayQuery.isFetching,
        isTurnFlowInProgress,
        inProgressLabel,
        latestRunSummary,
      },
      balanceAccounts: createBalanceAccounts(selectedSession),
      treasury: createTreasuryViewData(selectedSession),
      market: createMarketVisibilityViewData(selectedSession),
    },
    helpModal: {
      isOpen: isHelpOpen,
      onClose: () => setIsHelpOpen(false),
    },
  };
}
