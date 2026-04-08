import { describe, expect, it, vi } from 'vitest';

import { ReplayController } from './replay.controller.js';

describe('ReplayController', () => {
  it('returns replay data by game session id', async () => {
    const getGameReplayUseCase = {
      execute: vi.fn().mockResolvedValue({
        gameSession: {
          id: 'game-1',
          name: 'Replay Table',
          status: 'active',
          currentRound: 1,
        },
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            createdAt: '2026-04-08T10:00:00.000Z',
          },
        ],
        events: [],
      }),
    };

    const controller = new ReplayController(getGameReplayUseCase as never);
    const result = await controller.getReplay('game-1');

    expect(getGameReplayUseCase.execute).toHaveBeenCalledWith({
      gameSessionId: 'game-1',
    });
    expect(result.gameSession.id).toBe('game-1');
  });
});
