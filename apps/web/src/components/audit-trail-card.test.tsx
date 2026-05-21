import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { GameReplayRecord } from '../lib/api';
import {
  createAuditTrailViewData,
  type StreamedAuditMessageRecord,
} from '../features/audit-trail/model/audit-trail';
import type { AuditTrailViewModel } from '../features/audit-trail/view-model/use-audit-trail-view-model';

import { AuditTrailCard } from './audit-trail-card';

function buildReplay(): GameReplayRecord {
  return {
    gameSession: {
      id: 'session-1',
      name: 'Replay Session',
      status: 'active',
      currentRound: 2,
    },
    rounds: [
      {
        id: 'round-1',
        roundNumber: 2,
        createdAt: '2026-04-14T10:00:00.000Z',
      },
    ],
    events: [
      {
        id: 'event-listed-1',
        type: 'market_opportunity_listed',
        createdAt: '2026-04-14T09:59:00.000Z',
        roundNumber: 2,
        opportunityId: 'opp-1',
        opportunityTitle: 'Binary Event Volatility',
        opportunitySummary: 'Wide payoff event trade.',
        opportunityRiskLevel: 'high',
        listedRound: 2,
        settlementRound: 3,
        minCommitment: '5.0000',
        maxCommitment: '25.0000',
        worstCaseReturnBps: -300,
        bestCaseReturnBps: 420,
      },
      {
        id: 'event-resolved-1',
        type: 'market_opportunity_resolved',
        createdAt: '2026-04-14T09:59:30.000Z',
        roundNumber: 3,
        opportunityId: 'opp-1',
        opportunityTitle: 'Binary Event Volatility',
        participantCount: 1,
        totalPrincipal: '12.0000',
        totalProfitOrLoss: '3.6000',
        listedRound: 2,
        settlementRound: 3,
        participantSettlements: [
          {
            ownerAgentId: 'trader-1',
            ownerAgentName: 'Trader Bot',
            principal: '12.0000',
            profitOrLoss: '3.6000',
          },
        ],
      },
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `event-${index + 1}`,
        type: index === 1 ? ('message' as const) : ('action' as const),
        createdAt: `2026-04-14T10:${String(index).padStart(2, '0')}:00.000Z`,
        roundNumber: 2,
        turnNumber: Math.floor(index / 2) + 1,
        agentName: `Agent ${index + 1}`,
        actionType: 'finalize_turn' as const,
        senderAgentName: index === 1 ? 'Banker Bot' : undefined,
        recipientAgentName: index === 1 ? 'Trader Bot' : undefined,
        visibility: index === 1 ? ('private' as const) : undefined,
        content:
          index === 1
            ? 'Freshly persisted private message that should stay visible.'
            : undefined,
      })),
    ],
  };
}

function buildViewModel(input: {
  replay?: GameReplayRecord;
  streamedMessages?: StreamedAuditMessageRecord[];
  selectedRound?: number;
}): AuditTrailViewModel {
  const viewData = createAuditTrailViewData({
    ...input,
    activeFilter: 'all',
    activeWindow: 'all',
    activeRoundWindow: 'all',
  });

  return {
    activeFilter: 'all',
    activeRoundWindow: 'all',
    activeWindow: 'all',
    animatedEventIds: [],
    eventsByRound: viewData.eventsByRound,
    filterOptions: [
      { label: 'all', value: 'all' },
      { label: 'treasury', value: 'treasury' },
      { label: 'market', value: 'market' },
      { label: 'messages', value: 'messages' },
      { label: 'actions', value: 'actions' },
      { label: 'transfers', value: 'transfers' },
    ],
    hasReplayActivity:
      Boolean(input.replay) || viewData.visibleStreamedMessages.length > 0,
    isExpanded: true,
    mergedEventCount: viewData.mergedEvents.length,
    roundWindowOptions: [
      { label: 'Last 1 round', value: '1' },
      { label: 'Last 3 rounds', value: '3' },
      { label: 'Last 5 rounds', value: '5' },
      { label: 'All rounds', value: 'all' },
    ],
    timelineScrollRef: { current: null },
    visibleEventCount: viewData.visibleEvents.length,
    windowOptions: [
      { label: 'Last 5', value: '5' },
      { label: 'Last 10', value: '10' },
      { label: 'Last 20', value: '20' },
      { label: 'All', value: 'all' },
    ],
    setActiveFilter: () => undefined,
    setActiveRoundWindow: () => undefined,
    setActiveWindow: () => undefined,
    toggleExpanded: () => undefined,
  };
}

describe('AuditTrailCard', () => {
  it('shows all replay events by default so recent messages are not hidden behind the event window', () => {
    const replay = buildReplay();
    const html = renderToString(
      <AuditTrailCard
        viewModel={buildViewModel({
          replay,
          streamedMessages: [],
          selectedRound: 2,
        })}
        isFetching={false}
        isTurnFlowInProgress={false}
        latestRunSummary=""
      />,
    );

    expect(html).toContain('14<!-- --> / <!-- -->14<!-- --> events');
    expect(html).toContain(
      'Freshly persisted private message that should stay visible.',
    );
    expect(html).toContain('<option value="all" selected="">All</option>');
    expect(html).toContain('>market<');
    expect(html).toContain('Binary Event Volatility listed');
    expect(html).toContain('Trader Bot');
  });

  it('renders an in-flight streamed message in the audit trail without waiting for replay persistence', () => {
    const replay = buildReplay();
    const streamedMessages: StreamedAuditMessageRecord[] = [
      {
        streamId: 'stream-1',
        gameSessionId: 'session-1',
        roundNumber: 2,
        turnNumber: 7,
        senderAgentId: 'agent-1',
        senderAgentName: 'Banker Bot',
        recipientAgentId: 'agent-2',
        recipientAgentName: 'Trader Bot',
        visibility: 'private',
        content: 'Typing into the audit trail',
        occurredAt: '2026-04-14T10:20:00.000Z',
        status: 'streaming',
      },
    ];
    const html = renderToString(
      <AuditTrailCard
        viewModel={buildViewModel({
          replay,
          streamedMessages,
          selectedRound: 2,
        })}
        isFetching={false}
        isTurnFlowInProgress
        latestRunSummary="Banker Bot is drafting a message..."
      />,
    );

    expect(html).toContain('Typing into the audit trail');
    expect(html).toContain('Banker Bot / send_private_message');
    expect(html).toContain('streaming-cursor');
    expect(html).toContain('16<!-- --> / <!-- -->16<!-- --> events');
  });

  it('renders the streamed private-message action before any streamed message content exists', () => {
    const replay = buildReplay();
    const streamedMessages: StreamedAuditMessageRecord[] = [
      {
        streamId: 'stream-3',
        gameSessionId: 'session-1',
        roundNumber: 2,
        turnNumber: 8,
        senderAgentId: 'agent-1',
        senderAgentName: 'Banker Bot',
        recipientAgentId: 'agent-2',
        recipientAgentName: 'Trader Bot',
        visibility: 'private',
        content: '',
        occurredAt: '2026-04-14T10:22:00.000Z',
        status: 'streaming',
      },
    ];
    const html = renderToString(
      <AuditTrailCard
        viewModel={buildViewModel({
          replay,
          streamedMessages,
          selectedRound: 2,
        })}
        isFetching={false}
        isTurnFlowInProgress
        latestRunSummary="Banker Bot is drafting a message..."
      />,
    );

    expect(html).toContain('Banker Bot / send_private_message');
    expect(html).not.toContain('streaming-cursor');
    expect(html).toContain('15<!-- --> / <!-- -->15<!-- --> events');
  });

  it('does not duplicate a streamed message once replay contains the persisted message id', () => {
    const replay = buildReplay();
    const streamedMessages: StreamedAuditMessageRecord[] = [
      {
        streamId: 'stream-2',
        gameSessionId: 'session-1',
        roundNumber: 2,
        turnNumber: 7,
        senderAgentId: 'agent-1',
        senderAgentName: 'Banker Bot',
        recipientAgentId: 'agent-2',
        recipientAgentName: 'Trader Bot',
        visibility: 'private',
        content: 'Persisted final message.',
        occurredAt: '2026-04-14T10:21:00.000Z',
        status: 'completed',
        messageId: 'message-7',
      },
    ];
    replay.events.push({
      id: 'message-7',
      type: 'message',
      createdAt: '2026-04-14T10:21:00.000Z',
      roundNumber: 2,
      turnNumber: 7,
      senderAgentId: 'agent-1',
      senderAgentName: 'Banker Bot',
      recipientAgentId: 'agent-2',
      recipientAgentName: 'Trader Bot',
      visibility: 'private',
      content: 'Persisted final message.',
    });

    const html = renderToString(
      <AuditTrailCard
        viewModel={buildViewModel({
          replay,
          streamedMessages,
          selectedRound: 2,
        })}
        isFetching={false}
        isTurnFlowInProgress={false}
        latestRunSummary=""
      />,
    );

    expect(html.match(/Persisted final message\./g)).toHaveLength(1);
  });
});
