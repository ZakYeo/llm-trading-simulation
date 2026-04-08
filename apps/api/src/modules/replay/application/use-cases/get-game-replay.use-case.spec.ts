import { describe, expect, it } from 'vitest';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type {
  GameReplayRecord,
  ReplayReadModelPort,
} from '../ports/replay-read-model.port.js';
import { GetGameReplayUseCase } from './get-game-replay.use-case.js';

class InMemoryReplayReadModel implements ReplayReadModelPort {
  constructor(private readonly replay: GameReplayRecord | null) {}

  async findByGameSessionId(): Promise<GameReplayRecord | null> {
    return this.replay;
  }
}

describe('GetGameReplayUseCase', () => {
  it('returns a replay read model for an existing game session', async () => {
    const replay: GameReplayRecord = {
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
      events: [
        {
          id: 'transfer-1',
          type: 'transfer',
          createdAt: '2026-04-08T10:01:00.000Z',
          amount: '15.0000',
          sourceAgentId: 'agent-1',
          sourceAgentName: 'Trader Bot',
          destinationAgentId: 'agent-2',
          destinationAgentName: 'Banker Bot',
        },
        {
          id: 'message-1',
          type: 'message',
          createdAt: '2026-04-08T10:02:00.000Z',
          roundNumber: 1,
          turnNumber: 1,
          senderAgentId: 'agent-1',
          senderAgentName: 'Trader Bot',
          recipientAgentId: 'agent-2',
          recipientAgentName: 'Banker Bot',
          visibility: 'private',
          content: 'I can move first if you can match funds.',
        },
        {
          id: 'action-1',
          type: 'action',
          createdAt: '2026-04-08T10:03:00.000Z',
          roundNumber: 1,
          turnNumber: 2,
          agentId: 'agent-1',
          agentName: 'Trader Bot',
          recipientAgentId: 'agent-2',
          amount: '12.5000',
          content: 'I need short-term capital to press a momentum setup.',
          actionType: 'propose_direct_transfer',
        },
      ],
    };

    const useCase = new GetGameReplayUseCase(
      new InMemoryReplayReadModel(replay),
    );

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
      }),
    ).resolves.toEqual(replay);
  });

  it('fails when the replay does not exist', async () => {
    const useCase = new GetGameReplayUseCase(new InMemoryReplayReadModel(null));

    await expect(
      useCase.execute({
        gameSessionId: 'missing',
      }),
    ).rejects.toThrow(DomainInvariantError);
  });
});
