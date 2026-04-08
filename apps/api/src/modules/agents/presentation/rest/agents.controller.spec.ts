import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';

import { AgentsController } from './agents.controller.js';

describe('AgentsController', () => {
  it('runs a communication turn for a session', async () => {
    const orchestrateAgentRoundUseCase = {
      execute: vi.fn(),
    };
    const runAgentCommunicationTurnUseCase = {
      execute: vi.fn().mockResolvedValue({
        gameSessionId: 'game-1',
        roundNumber: 1,
        turnNumber: 1,
        actions: [],
        actionRecords: [],
        messages: [],
      }),
    };

    const controller = new AgentsController(
      orchestrateAgentRoundUseCase as never,
      runAgentCommunicationTurnUseCase as never,
      { streamForGameSession: vi.fn() } as never,
    );
    const result = await controller.runCommunicationTurn('game-1');

    expect(runAgentCommunicationTurnUseCase.execute).toHaveBeenCalledWith({
      gameSessionId: 'game-1',
    });
    expect(result.gameSessionId).toBe('game-1');
  });

  it('orchestrates a multi-turn agent round for a session', async () => {
    const orchestrateAgentRoundUseCase = {
      execute: vi.fn().mockResolvedValue({
        gameSessionId: 'game-1',
        roundNumber: 1,
        turns: [],
      }),
    };
    const controller = new AgentsController(
      orchestrateAgentRoundUseCase as never,
      { execute: vi.fn() } as never,
      { streamForGameSession: vi.fn() } as never,
    );
    const result = await controller.orchestrateRound('game-1', {
      turnCount: 2,
    });

    expect(orchestrateAgentRoundUseCase.execute).toHaveBeenCalledWith({
      gameSessionId: 'game-1',
      turnCount: 2,
    });
    expect(result.gameSessionId).toBe('game-1');
  });

  it('streams session-scoped agent events as SSE messages', async () => {
    const agentSessionEventStreamService = {
      streamForGameSession: vi.fn().mockReturnValueOnce(
        of({
          type: 'turn_completed',
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          actionCount: 5,
          messageCount: 2,
          occurredAt: '2026-04-08T10:00:00.000Z',
        }),
      ),
    };
    const controller = new AgentsController(
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      agentSessionEventStreamService as never,
    );

    const event = await firstValueFrom(
      controller.streamSessionEvents('game-1') as never,
    );

    expect(
      agentSessionEventStreamService.streamForGameSession,
    ).toHaveBeenCalledWith('game-1');
    expect(event).toEqual({
      type: 'turn_completed',
      data: {
        type: 'turn_completed',
        gameSessionId: 'game-1',
        roundNumber: 1,
        turnNumber: 2,
        actionCount: 5,
        messageCount: 2,
        occurredAt: '2026-04-08T10:00:00.000Z',
      },
    });
  });
});
