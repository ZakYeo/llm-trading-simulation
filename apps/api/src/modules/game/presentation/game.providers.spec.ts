import { describe, expect, it } from 'vitest';

import { CreateGameSessionUseCase } from '../application/use-cases/create-game-session.use-case.js';
import { DepositToBankUseCase } from '../application/use-cases/deposit-to-bank.use-case.js';
import { GetGameSessionUseCase } from '../application/use-cases/get-game-session.use-case.js';
import { TransferFundsUseCase } from '../application/use-cases/transfer-funds.use-case.js';
import { WithdrawFromBankUseCase } from '../application/use-cases/withdraw-from-bank.use-case.js';
import { LedgerService } from '../domain/services/ledger.service.js';
import { PrismaGameSessionRepository } from '../infrastructure/prisma/prisma-game-session.repository.js';
import { createGameProviders } from './game.providers.js';
import {
  GAME_SESSION_REPOSITORY,
  ID_GENERATOR,
} from '../../shared/application/tokens.js';
import { RandomIdGenerator } from '../../shared/infrastructure/id/random-id-generator.js';
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

describe('createGameProviders', () => {
  it('registers the expected infrastructure and use-case providers', () => {
    const providers = createGameProviders();

    expect(providers).toHaveLength(9);
    expect(providers[0]).toBe(PrismaService);
    expect(providers[1]).toBe(LedgerService);
    expect(providers[2]).toMatchObject({
      provide: GAME_SESSION_REPOSITORY,
      inject: [PrismaService],
    });
    expect(providers[3]).toMatchObject({
      provide: ID_GENERATOR,
      useClass: RandomIdGenerator,
    });
    expect(providers[4]).toMatchObject({
      provide: CreateGameSessionUseCase,
      inject: [GAME_SESSION_REPOSITORY, ID_GENERATOR],
    });
    expect(providers[5]).toMatchObject({
      provide: GetGameSessionUseCase,
      inject: [GAME_SESSION_REPOSITORY],
    });
    expect(providers[6]).toMatchObject({
      provide: DepositToBankUseCase,
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    });
    expect(providers[7]).toMatchObject({
      provide: WithdrawFromBankUseCase,
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    });
    expect(providers[8]).toMatchObject({
      provide: TransferFundsUseCase,
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    });
  });

  it('builds the repository and use cases from their factories', () => {
    const providers = createGameProviders();
    const repositoryProvider = expectFactoryProvider(providers[2]);
    const createSessionProvider = expectFactoryProvider(providers[4]);
    const getSessionProvider = expectFactoryProvider(providers[5]);
    const depositProvider = expectFactoryProvider(providers[6]);
    const withdrawProvider = expectFactoryProvider(providers[7]);
    const transferProvider = expectFactoryProvider(providers[8]);

    const prismaService = {} as PrismaService;
    const repository = repositoryProvider.useFactory(prismaService);
    const ledgerService = new LedgerService();
    const idGenerator = new RandomIdGenerator();

    expect(repository).toBeInstanceOf(PrismaGameSessionRepository);
    expect(
      createSessionProvider.useFactory(repository, idGenerator),
    ).toBeInstanceOf(CreateGameSessionUseCase);
    expect(getSessionProvider.useFactory(repository)).toBeInstanceOf(
      GetGameSessionUseCase,
    );
    expect(
      depositProvider.useFactory(repository, ledgerService),
    ).toBeInstanceOf(DepositToBankUseCase);
    expect(
      withdrawProvider.useFactory(repository, ledgerService),
    ).toBeInstanceOf(WithdrawFromBankUseCase);
    expect(
      transferProvider.useFactory(repository, ledgerService),
    ).toBeInstanceOf(TransferFundsUseCase);
  });
});
