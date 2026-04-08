import { describe, expect, it, vi } from 'vitest';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { OrchestrateAgentRoundUseCase } from './orchestrate-agent-round.use-case.js';

describe('OrchestrateAgentRoundUseCase', () => {
  it('executes the requested number of communication turns in sequence', async () => {
    const runAgentCommunicationTurnUseCase = {
      execute: vi
        .fn()
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 1,
          actions: [],
          actionRecords: [],
          messages: [],
        })
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          actions: [],
          actionRecords: [],
          messages: [],
        }),
    };

    const useCase = new OrchestrateAgentRoundUseCase(
      runAgentCommunicationTurnUseCase as never,
    );

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        turnCount: 2,
      }),
    ).resolves.toEqual({
      gameSessionId: 'game-1',
      roundNumber: 1,
      turns: [
        {
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 1,
          actions: [],
          actionRecords: [],
          messages: [],
        },
        {
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          actions: [],
          actionRecords: [],
          messages: [],
        },
      ],
    });

    expect(runAgentCommunicationTurnUseCase.execute).toHaveBeenNthCalledWith(
      1,
      {
        gameSessionId: 'game-1',
        turnNumber: 1,
      },
    );
    expect(runAgentCommunicationTurnUseCase.execute).toHaveBeenNthCalledWith(
      2,
      {
        gameSessionId: 'game-1',
        turnNumber: 2,
      },
    );
  });

  it('rejects non-positive turn counts', async () => {
    const useCase = new OrchestrateAgentRoundUseCase({
      execute: vi.fn(),
    } as never);

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        turnCount: 0,
      }),
    ).rejects.toThrow(DomainInvariantError);
  });
});
