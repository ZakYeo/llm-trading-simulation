import { describe, expect, it, vi } from 'vitest';

import { createSessionEventHandlers } from './use-session-events';

describe('createSessionEventHandlers', () => {
  it('refreshes live state on turn completion so replay updates do not wait for a later event', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const setLatestRunSummary = vi.fn();
    const handlers = createSessionEventHandlers({
      queryClient: { invalidateQueries },
      selectedSessionId: 'session-1',
      setLatestRunSummary,
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
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['game-session', 'session-1'],
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['game-replay', 'session-1'],
    });
  });

  it('refreshes live state for action, transfer, and round completion events', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const setLatestRunSummary = vi.fn();
    const handlers = createSessionEventHandlers({
      queryClient: { invalidateQueries },
      selectedSessionId: 'session-2',
      setLatestRunSummary,
    });

    handlers.handleActionProgressed({
      data: JSON.stringify({
        type: 'action_progressed',
        gameSessionId: 'session-2',
        roundNumber: 1,
        turnNumber: 1,
        agentId: 'agent-1',
        agentName: 'Banker Bot',
        actionType: 'send_private_message',
        occurredAt: '2026-04-14T10:00:00.000Z',
      }),
    } as MessageEvent<string>);
    handlers.handleTransferSettled({
      data: JSON.stringify({
        type: 'transfer_settled',
        gameSessionId: 'session-2',
        roundNumber: 1,
        turnNumber: 3,
        sourceAgentId: 'agent-1',
        destinationAgentId: 'agent-2',
        amount: '8.5000',
        occurredAt: '2026-04-14T10:01:00.000Z',
      }),
    } as MessageEvent<string>);
    handlers.handleRoundCompleted({
      data: JSON.stringify({
        type: 'round_completed',
        gameSessionId: 'session-2',
        roundNumber: 1,
        turnCount: 4,
        occurredAt: '2026-04-14T10:02:00.000Z',
      }),
    } as MessageEvent<string>);

    await Promise.resolve();

    expect(invalidateQueries).toHaveBeenCalledTimes(6);
    expect(setLatestRunSummary).toHaveBeenLastCalledWith(
      'Round 1 finished after 4 turns.',
    );
  });
});
