import { describe, expect, it, vi } from 'vitest';

import { AgentsController } from './agents.controller.js';

describe('AgentsController', () => {
  it('runs a communication turn for a session', async () => {
    const runAgentCommunicationTurnUseCase = {
      execute: vi.fn().mockResolvedValue({
        gameSessionId: 'game-1',
        roundNumber: 1,
        actions: [],
        messages: [],
      }),
    };

    const controller = new AgentsController(
      runAgentCommunicationTurnUseCase as never,
    );
    const result = await controller.runCommunicationTurn('game-1');

    expect(runAgentCommunicationTurnUseCase.execute).toHaveBeenCalledWith({
      gameSessionId: 'game-1',
    });
    expect(result.gameSessionId).toBe('game-1');
  });
});
