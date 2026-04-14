import { afterEach, describe, expect, it } from 'vitest';

import { AdvanceGameRoundUseCase } from '../application/use-cases/advance-game-round.use-case.js';
import { CreateGameSessionUseCase } from '../application/use-cases/create-game-session.use-case.js';
import { DepositToBankUseCase } from '../application/use-cases/deposit-to-bank.use-case.js';
import { GetGameSessionUseCase } from '../application/use-cases/get-game-session.use-case.js';
import { OpenMarketPositionUseCase } from '../application/use-cases/open-market-position.use-case.js';
import { PlaceFundsWithBankerUseCase } from '../application/use-cases/place-funds-with-banker.use-case.js';
import { RedeemFundsFromBankerUseCase } from '../application/use-cases/redeem-funds-from-banker.use-case.js';
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
  const originalDefaultInterestRateBps = process.env.DEFAULT_INTEREST_RATE_BPS;

  afterEach(() => {
    process.env.DEFAULT_INTEREST_RATE_BPS = originalDefaultInterestRateBps;
  });

  it('registers the expected infrastructure and use-case providers', () => {
    const providers = createGameProviders();

    expect(providers).toHaveLength(13);
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
      provide: AdvanceGameRoundUseCase,
      inject: [GAME_SESSION_REPOSITORY],
    });
    expect(providers[7]).toMatchObject({
      provide: DepositToBankUseCase,
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    });
    expect(providers[8]).toMatchObject({
      provide: WithdrawFromBankUseCase,
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    });
    expect(providers[9]).toMatchObject({
      provide: TransferFundsUseCase,
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    });
    expect(providers[10]).toMatchObject({
      provide: PlaceFundsWithBankerUseCase,
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    });
    expect(providers[11]).toMatchObject({
      provide: RedeemFundsFromBankerUseCase,
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    });
    expect(providers[12]).toMatchObject({
      provide: OpenMarketPositionUseCase,
      inject: [GAME_SESSION_REPOSITORY],
    });
  });

  it('builds the repository and use cases from their factories', () => {
    delete process.env.DEFAULT_INTEREST_RATE_BPS;
    const providers = createGameProviders();
    const repositoryProvider = expectFactoryProvider(providers[2]);
    const createSessionProvider = expectFactoryProvider(providers[4]);
    const getSessionProvider = expectFactoryProvider(providers[5]);
    const advanceRoundProvider = expectFactoryProvider(providers[6]);
    const depositProvider = expectFactoryProvider(providers[7]);
    const withdrawProvider = expectFactoryProvider(providers[8]);
    const transferProvider = expectFactoryProvider(providers[9]);
    const placeFundsProvider = expectFactoryProvider(providers[10]);
    const redeemFundsProvider = expectFactoryProvider(providers[11]);
    const openMarketProvider = expectFactoryProvider(providers[12]);

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
    expect(advanceRoundProvider.useFactory(repository)).toBeInstanceOf(
      AdvanceGameRoundUseCase,
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
    expect(
      placeFundsProvider.useFactory(repository, ledgerService),
    ).toBeInstanceOf(PlaceFundsWithBankerUseCase);
    expect(
      redeemFundsProvider.useFactory(repository, ledgerService),
    ).toBeInstanceOf(RedeemFundsFromBankerUseCase);
    expect(openMarketProvider.useFactory(repository)).toBeInstanceOf(
      OpenMarketPositionUseCase,
    );
  });

  it('fails fast when the configured default interest rate is invalid', () => {
    process.env.DEFAULT_INTEREST_RATE_BPS = '-1';
    const providers = createGameProviders();
    const advanceRoundProvider = expectFactoryProvider(providers[6]);

    expect(() => advanceRoundProvider.useFactory({})).toThrow(
      'DEFAULT_INTEREST_RATE_BPS must be a non-negative integer when provided.',
    );
  });
});
