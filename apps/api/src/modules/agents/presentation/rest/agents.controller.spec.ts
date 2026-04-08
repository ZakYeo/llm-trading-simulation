import { describe, expect, it, vi } from 'vitest';

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
});
