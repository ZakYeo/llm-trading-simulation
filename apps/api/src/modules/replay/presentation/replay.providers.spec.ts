import { describe, expect, it } from 'vitest';

import { GetGameReplayUseCase } from '../application/use-cases/get-game-replay.use-case.js';
import { PrismaReplayReadModel } from '../infrastructure/prisma/prisma-replay-read-model.js';
import { createReplayProviders } from './replay.providers.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

interface FactoryProvider {
  useFactory: (...args: unknown[]) => unknown;
}

function expectFactoryProvider(provider: unknown): FactoryProvider {
  if (
    typeof provider !== 'object' ||
    !provider ||
    !('useFactory' in provider) ||
    typeof provider.useFactory !== 'function'
  ) {
    throw new Error('Expected a factory provider.');
  }

  return provider as FactoryProvider;
}

describe('createReplayProviders', () => {
  it('registers the expected replay providers', () => {
    const providers = createReplayProviders();

    expect(providers).toHaveLength(3);
    expect(providers[0]).toBe(PrismaService);
    expect(providers[1]).toMatchObject({
      provide: PrismaReplayReadModel,
      inject: [PrismaService],
    });
    expect(providers[2]).toMatchObject({
      provide: GetGameReplayUseCase,
      inject: [PrismaReplayReadModel],
    });
  });

  it('builds the replay read model and use case from their factories', () => {
    const providers = createReplayProviders();
    const readModelProvider = expectFactoryProvider(providers[1]);
    const useCaseProvider = expectFactoryProvider(providers[2]);

    const prismaService = {} as PrismaService;
    const readModel = readModelProvider.useFactory(prismaService);

    expect(readModel).toBeInstanceOf(PrismaReplayReadModel);
    expect(useCaseProvider.useFactory(readModel)).toBeInstanceOf(
      GetGameReplayUseCase,
    );
  });
});
