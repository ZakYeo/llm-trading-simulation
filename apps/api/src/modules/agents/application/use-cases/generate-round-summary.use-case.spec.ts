import { describe, expect, it, vi } from 'vitest';
import type { GameReplayRecord } from '@llm-sim/shared-types';
import { GenerateRoundSummaryUseCase } from './generate-round-summary.use-case.js';

function setup(fail = false) {
  const replay: GameReplayRecord = {
    gameSession: {
      id: 'session',
      name: 'Test',
      status: 'active',
      currentRound: 2,
    },
    rounds: [],
    events: [
      {
        id: 'old',
        type: 'message',
        roundNumber: 1,
        content: 'Old round',
        createdAt: '2026-01-01T00:00:00Z',
      },
      ...Array.from({ length: 205 }, (_, i) => ({
        id: `e-${i}`,
        type: 'message' as const,
        roundNumber: 2,
        content: `Fact ${i}`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 1, 0, i)).toISOString(),
      })),
    ],
  };
  const read = { findByGameSessionId: vi.fn().mockResolvedValue(replay) };
  const gateway = {
    provider: 'openai' as const,
    generate: fail
      ? vi.fn().mockRejectedValue(new Error('private provider failure'))
      : vi
          .fn()
          .mockResolvedValue('Agents discussed the available opportunity.'),
  };
  const repository = {
    find: vi.fn(),
    save: vi.fn().mockImplementation(async (value) => value),
  };
  return {
    gateway,
    repository,
    useCase: new GenerateRoundSummaryUseCase(read, gateway, repository),
  };
}
describe('GenerateRoundSummaryUseCase', () => {
  it('summarizes only this round, bounds context and persists coverage and provenance', async () => {
    const { gateway, repository, useCase } = setup();
    const result = await useCase.execute({
      gameSessionId: 'session',
      roundNumber: 2,
    });
    expect(gateway.generate.mock.calls[0][0]).toMatchObject({
      roundNumber: 2,
      totalEventCount: 205,
    });
    expect(gateway.generate.mock.calls[0][0].events).toHaveLength(200);
    expect(gateway.generate.mock.calls[0][0].events[0].id).toBe('e-5');
    expect(result).toMatchObject({
      gameSessionId: 'session',
      roundNumber: 2,
      status: 'ready',
      provider: 'openai',
      eventCount: 205,
      includedEventCount: 200,
      text: 'Agents discussed the available opportunity.',
    });
    expect(repository.save).toHaveBeenCalledWith(result);
  });
  it('records a safe unavailable state on generation failure', async () => {
    const { useCase } = setup(true);
    await expect(
      useCase.execute({ gameSessionId: 'session', roundNumber: 2 }),
    ).resolves.toMatchObject({ status: 'unavailable', text: null });
  });
});
