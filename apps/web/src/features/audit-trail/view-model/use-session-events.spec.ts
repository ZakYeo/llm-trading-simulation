import { describe, expect, it, vi } from 'vitest';

import type { StreamedAuditMessageRecord } from './use-session-events';
import { createSessionEventHandlers } from './use-session-events';

describe('createSessionEventHandlers', () => {
  it('refreshes live state on turn completion so replay updates do not wait for a later event', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const setLatestRunSummary = vi.fn();
    let streamedMessages: StreamedAuditMessageRecord[] = [];
    const handlers = createSessionEventHandlers({
      queryClient: { invalidateQueries },
      selectedSessionId: 'session-1',
      setLatestRunSummary,
      setStreamedMessages: (updater) => {
        streamedMessages =
          typeof updater === 'function' ? updater(streamedMessages) : updater;
      },
    });

    handlers.handleTurnCompleted({
      data: JSON.stringify({
        type: 'turn_completed',
        gameSessionId: 'session-1',
        roundNumber: 1,
        turnNumber: 4,
        actionCount: 2,
        messageCount: 1,
        occurredAt: '2026-04-14T10:00:00.000Z',
      }),
    } as MessageEvent<string>);

    await Promise.resolve();

    expect(setLatestRunSummary).toHaveBeenCalledWith(
      'Turn 4 completed with 2 actions and 1 messages.',
    );
    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(streamedMessages).toEqual([]);
  });

  it('builds streamed message state from SSE events and attaches the persisted message id without forcing an immediate replay refresh', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const setLatestRunSummary = vi.fn();
    let streamedMessages: StreamedAuditMessageRecord[] = [];
    const handlers = createSessionEventHandlers({
      queryClient: { invalidateQueries },
      selectedSessionId: 'session-2',
      setLatestRunSummary,
      setStreamedMessages: (updater) => {
        streamedMessages =
          typeof updater === 'function' ? updater(streamedMessages) : updater;
      },
    });

    handlers.handleMessageStreamStarted({
      data: JSON.stringify({
        type: 'message_stream_started',
        streamId: 'stream-1',
        gameSessionId: 'session-2',
        roundNumber: 1,
        turnNumber: 1,
        agentId: 'agent-1',
        agentName: 'Banker Bot',
        recipientAgentId: 'agent-2',
        recipientAgentName: 'Trader Bot',
        visibility: 'private',
        occurredAt: '2026-04-14T10:00:00.000Z',
      }),
    } as MessageEvent<string>);
    handlers.handleMessageStreamDelta({
      data: JSON.stringify({
        type: 'message_stream_delta',
        streamId: 'stream-1',
        gameSessionId: 'session-2',
        roundNumber: 1,
        turnNumber: 1,
        agentId: 'agent-1',
        agentName: 'Banker Bot',
        recipientAgentId: 'agent-2',
        recipientAgentName: 'Trader Bot',
        visibility: 'private',
        delta: 'Hello',
        content: 'Hello',
        occurredAt: '2026-04-14T10:00:01.000Z',
      }),
    } as MessageEvent<string>);
    handlers.handleMessageStreamCompleted({
      data: JSON.stringify({
        type: 'message_stream_completed',
        streamId: 'stream-1',
        gameSessionId: 'session-2',
        roundNumber: 1,
        turnNumber: 1,
        agentId: 'agent-1',
        agentName: 'Banker Bot',
        recipientAgentId: 'agent-2',
        recipientAgentName: 'Trader Bot',
        visibility: 'private',
        content: 'Hello Trader',
        occurredAt: '2026-04-14T10:00:02.000Z',
      }),
    } as MessageEvent<string>);
    handlers.handleActionProgressed({
      data: JSON.stringify({
        type: 'action_progressed',
        gameSessionId: 'session-2',
        roundNumber: 1,
        turnNumber: 1,
        agentId: 'agent-1',
        agentName: 'Banker Bot',
        actionType: 'send_private_message',
        streamId: 'stream-1',
        messageId: 'message-9',
        messageVisibility: 'private',
        occurredAt: '2026-04-14T10:00:03.000Z',
      }),
    } as MessageEvent<string>);

    await Promise.resolve();

    expect(streamedMessages).toEqual([
      expect.objectContaining({
        streamId: 'stream-1',
        content: 'Hello Trader',
        status: 'completed',
        messageId: 'message-9',
      }),
    ]);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('removes aborted streamed messages and still refreshes for transfer and round completion events', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const setLatestRunSummary = vi.fn();
    let streamedMessages: StreamedAuditMessageRecord[] = [
      {
        streamId: 'stream-2',
        gameSessionId: 'session-3',
        roundNumber: 1,
        turnNumber: 1,
        senderAgentId: 'agent-1',
        senderAgentName: 'Banker Bot',
        recipientAgentId: null,
        visibility: 'public',
        content: 'Draft',
        occurredAt: '2026-04-14T10:00:00.000Z',
        status: 'streaming',
      },
    ];
    const handlers = createSessionEventHandlers({
      queryClient: { invalidateQueries },
      selectedSessionId: 'session-3',
      setLatestRunSummary,
      setStreamedMessages: (updater) => {
        streamedMessages =
          typeof updater === 'function' ? updater(streamedMessages) : updater;
      },
    });

    handlers.handleMessageStreamAborted({
      data: JSON.stringify({
        type: 'message_stream_aborted',
        streamId: 'stream-2',
        gameSessionId: 'session-3',
        roundNumber: 1,
        turnNumber: 2,
        agentId: 'agent-1',
        agentName: 'Banker Bot',
        recipientAgentId: null,
        visibility: 'public',
        occurredAt: '2026-04-14T10:01:00.000Z',
      }),
    } as MessageEvent<string>);
    handlers.handleTransferSettled({
      data: JSON.stringify({
        type: 'transfer_settled',
        gameSessionId: 'session-3',
        roundNumber: 1,
        turnNumber: 3,
        sourceAgentId: 'agent-1',
        destinationAgentId: 'agent-2',
        amount: '8.5000',
        occurredAt: '2026-04-14T10:01:30.000Z',
      }),
    } as MessageEvent<string>);
    handlers.handleRoundCompleted({
      data: JSON.stringify({
        type: 'round_completed',
        gameSessionId: 'session-3',
        roundNumber: 1,
        turnCount: 4,
        occurredAt: '2026-04-14T10:02:00.000Z',
      }),
    } as MessageEvent<string>);

    await Promise.resolve();

    expect(streamedMessages).toEqual([]);
    expect(invalidateQueries).toHaveBeenCalledTimes(6);
    expect(setLatestRunSummary).toHaveBeenLastCalledWith(
      'Round 1 finished after 4 turns.',
    );
  });
});
