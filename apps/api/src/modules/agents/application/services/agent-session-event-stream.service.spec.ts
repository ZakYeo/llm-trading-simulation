import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { AgentSessionEventStreamService } from './agent-session-event-stream.service.js';

describe('AgentSessionEventStreamService', () => {
  it('streams only events for the requested session', async () => {
    const service = new AgentSessionEventStreamService();
    const eventPromise = firstValueFrom(service.streamForGameSession('game-2'));

    service.publish({
      type: 'action_progressed',
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 1,
      agentId: 'agent-1',
      agentName: 'Banker Bot',
      actionType: 'send_private_message',
      messageId: 'message-1',
      messageVisibility: 'private',
      occurredAt: '2026-04-08T10:00:00.000Z',
    });
    service.publish({
      type: 'turn_completed',
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 1,
      actionCount: 1,
      messageCount: 0,
      occurredAt: '2026-04-08T10:00:00.500Z',
    });
    service.publish({
      type: 'action_progressed',
      gameSessionId: 'game-2',
      roundNumber: 1,
      turnNumber: 2,
      agentId: 'agent-2',
      agentName: 'Trader Bot',
      actionType: 'send_private_message',
      messageId: 'message-2',
      messageVisibility: 'private',
      occurredAt: '2026-04-08T10:00:01.000Z',
    });

    await expect(eventPromise).resolves.toEqual({
      type: 'action_progressed',
      gameSessionId: 'game-2',
      roundNumber: 1,
      turnNumber: 2,
      agentId: 'agent-2',
      agentName: 'Trader Bot',
      actionType: 'send_private_message',
      messageId: 'message-2',
      messageVisibility: 'private',
      occurredAt: '2026-04-08T10:00:01.000Z',
    });
  });

  it('passes through streamed message events for the requested session', async () => {
    const service = new AgentSessionEventStreamService();
    const eventPromise = firstValueFrom(service.streamForGameSession('game-3'));

    service.publish({
      type: 'message_stream_delta',
      streamId: 'stream-1',
      gameSessionId: 'game-3',
      roundNumber: 1,
      turnNumber: 4,
      agentId: 'agent-1',
      agentName: 'Banker Bot',
      recipientAgentId: 'agent-2',
      recipientAgentName: 'Trader Bot',
      visibility: 'private',
      delta: 'Hello',
      content: 'Hello',
      occurredAt: '2026-04-08T10:00:02.000Z',
    });

    await expect(eventPromise).resolves.toEqual({
      type: 'message_stream_delta',
      streamId: 'stream-1',
      gameSessionId: 'game-3',
      roundNumber: 1,
      turnNumber: 4,
      agentId: 'agent-1',
      agentName: 'Banker Bot',
      recipientAgentId: 'agent-2',
      recipientAgentName: 'Trader Bot',
      visibility: 'private',
      delta: 'Hello',
      content: 'Hello',
      occurredAt: '2026-04-08T10:00:02.000Z',
    });
  });
});
