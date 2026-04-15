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
});
