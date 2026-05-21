import { describe, expect, it } from 'vitest';

import type { GameReplayRecord } from '../../../lib/api';
import { createAuditTrailViewData } from './audit-trail';

function buildReplay(): GameReplayRecord {
  return {
    gameSession: {
      id: 'session-1',
      name: 'Replay Session',
      status: 'active',
      currentRound: 2,
    },
    rounds: [],
    events: [],
  };
}

describe('createAuditTrailViewData', () => {
  it('keeps the same animation key when a streamed message becomes a persisted replay message', () => {
    const streamedMessages = [
      {
        streamId: 'stream-1',
        gameSessionId: 'session-1',
        roundNumber: 2,
        turnNumber: 7,
        senderAgentId: 'agent-1',
        senderAgentName: 'Banker Bot',
        recipientAgentId: 'agent-2',
        recipientAgentName: 'Trader Bot',
        visibility: 'private' as const,
        content: 'Persisted final message.',
        occurredAt: '2026-04-14T10:21:00.000Z',
        status: 'completed' as const,
        messageId: 'message-7',
      },
    ];

    const beforePersistence = createAuditTrailViewData({
      replay: buildReplay(),
      streamedMessages,
      selectedRound: 2,
      activeFilter: 'all',
      activeWindow: 'all',
      activeRoundWindow: 'all',
    });

    const persistedReplay = buildReplay();
    persistedReplay.events.push({
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

    const afterPersistence = createAuditTrailViewData({
      replay: persistedReplay,
      streamedMessages,
      selectedRound: 2,
      activeFilter: 'all',
      activeWindow: 'all',
      activeRoundWindow: 'all',
    });

    expect(beforePersistence.visibleEvents).toHaveLength(2);
    expect(afterPersistence.visibleEvents).toHaveLength(1);
    expect(
      beforePersistence.visibleEvents.find((event) => event.type === 'message')
        ?.animationKey,
    ).toBe('stream-message-stream-1');
    expect(afterPersistence.visibleEvents[0]?.animationKey).toBe(
      'stream-message-stream-1',
    );
  });

  it('keeps the same action animation key when a streamed send-message action becomes a persisted replay action', () => {
    const streamedMessages = [
      {
        streamId: 'stream-2',
        gameSessionId: 'session-1',
        roundNumber: 2,
        turnNumber: 8,
        senderAgentId: 'agent-1',
        senderAgentName: 'Banker Bot',
        recipientAgentId: 'agent-2',
        recipientAgentName: 'Trader Bot',
        visibility: 'private' as const,
        content: 'Persisted final message.',
        occurredAt: '2026-04-14T10:22:00.000Z',
        status: 'completed' as const,
      },
    ];

    const beforePersistence = createAuditTrailViewData({
      replay: buildReplay(),
      streamedMessages,
      selectedRound: 2,
      activeFilter: 'all',
      activeWindow: 'all',
      activeRoundWindow: 'all',
    });

    const persistedReplay = buildReplay();
    persistedReplay.events.push({
      id: 'action-8',
      type: 'action',
      createdAt: '2026-04-14T10:22:01.000Z',
      roundNumber: 2,
      turnNumber: 8,
      agentId: 'agent-1',
      agentName: 'Banker Bot',
      actionType: 'send_private_message',
    });

    const afterPersistence = createAuditTrailViewData({
      replay: persistedReplay,
      streamedMessages,
      selectedRound: 2,
      activeFilter: 'all',
      activeWindow: 'all',
      activeRoundWindow: 'all',
    });

    expect(
      beforePersistence.visibleEvents.find((event) => event.type === 'action')
        ?.animationKey,
    ).toBe('stream-action-stream-2');
    expect(
      afterPersistence.visibleEvents.find((event) => event.type === 'action')
        ?.animationKey,
    ).toBe('stream-action-stream-2');
    expect(
      afterPersistence.visibleEvents.filter((event) => event.type === 'action'),
    ).toHaveLength(1);
  });

  it('returns display-ready timeline labels and meta for market events', () => {
    const replay = buildReplay();
    replay.events.push(
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
    );

    const viewData = createAuditTrailViewData({
      replay,
      selectedRound: 2,
      activeFilter: 'all',
      activeWindow: 'all',
      activeRoundWindow: 'all',
    });

    expect(viewData.visibleEvents[0]).toMatchObject({
      animationId: 'event-listed-1',
      badgeLabel: 'market opportunity listed',
      isMarketOpportunityEvent: true,
      label: 'Binary Event Volatility listed',
      roundLabel: 'Round 2',
    });
    expect(viewData.visibleEvents[0]?.listedMeta).toEqual([
      { label: 'Risk', value: 'high' },
      { label: 'Window', value: 'R2 to R3' },
      { label: 'Commitment', value: '5.00 - 25.00' },
      { label: 'Range', value: '-300 bps to +420 bps' },
    ]);
    expect(viewData.visibleEvents[1]).toMatchObject({
      label: 'Binary Event Volatility resolved',
      resolvedMeta: [
        { label: 'Participants', value: '1' },
        { label: 'Total principal', value: '12.00' },
        { label: 'Net PnL', value: '+3.60' },
        { label: 'Window', value: 'R2 to R3' },
      ],
      participantRows: [
        {
          key: 'event-resolved-1-trader-1',
          ownerAgentName: 'Trader Bot',
          principalLabel: '12.00',
          profitOrLossLabel: '+3.60',
        },
      ],
    });
  });
});
