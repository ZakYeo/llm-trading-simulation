import type { IdGeneratorPort } from '../../shared/application/ports/id-generator.port.js';
import { LedgerService } from '../domain/services/ledger.service.js';
import type { GameSessionRepositoryPort } from '../application/ports/game-session-repository.port.js';
import { PrismaGameSessionRepository } from '../infrastructure/prisma/prisma-game-session.repository.js';
import type { PrismaClientLike } from '../infrastructure/prisma/game-session-prisma.contracts.js';
import { AdvanceGameRoundUseCase } from '../application/use-cases/advance-game-round.use-case.js';
import { CreateGameSessionUseCase } from '../application/use-cases/create-game-session.use-case.js';
import { DepositToBankUseCase } from '../application/use-cases/deposit-to-bank.use-case.js';
import { GetGameSessionUseCase } from '../application/use-cases/get-game-session.use-case.js';
import { WithdrawFromBankUseCase } from '../application/use-cases/withdraw-from-bank.use-case.js';
import { TransferFundsUseCase } from '../application/use-cases/transfer-funds.use-case.js';
import { PlaceFundsWithBankerUseCase } from '../application/use-cases/place-funds-with-banker.use-case.js';
import { RedeemFundsFromBankerUseCase } from '../application/use-cases/redeem-funds-from-banker.use-case.js';
import {
  GAME_SESSION_REPOSITORY,
  ID_GENERATOR,
} from '../../shared/application/tokens.js';
import { RandomIdGenerator } from '../../shared/infrastructure/id/random-id-generator.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

function resolveDefaultInterestRateBps() {
  const configuredValue = process.env.DEFAULT_INTEREST_RATE_BPS;

  if (!configuredValue) {
    return 250;
  }

  const parsed = Number.parseInt(configuredValue, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      'DEFAULT_INTEREST_RATE_BPS must be a non-negative integer when provided.',
    );
  }

  return parsed;
}

export function createGameProviders() {
  return [
    PrismaService,
    LedgerService,
    {
      provide: GAME_SESSION_REPOSITORY,
      useFactory: (prismaService: PrismaService) =>
        new PrismaGameSessionRepository(
          prismaService as unknown as PrismaClientLike,
        ),
      inject: [PrismaService],
    },
    {
      provide: ID_GENERATOR,
      useClass: RandomIdGenerator,
    },
    {
      provide: CreateGameSessionUseCase,
      useFactory: (
        repository: GameSessionRepositoryPort,
        idGenerator: IdGeneratorPort,
      ) => new CreateGameSessionUseCase(repository, idGenerator),
      inject: [GAME_SESSION_REPOSITORY, ID_GENERATOR],
    },
    {
      provide: GetGameSessionUseCase,
      useFactory: (repository: GameSessionRepositoryPort) =>
        new GetGameSessionUseCase(repository),
      inject: [GAME_SESSION_REPOSITORY],
    },
    {
      provide: AdvanceGameRoundUseCase,
      useFactory: (repository: GameSessionRepositoryPort) =>
        new AdvanceGameRoundUseCase(
          repository,
          resolveDefaultInterestRateBps(),
        ),
      inject: [GAME_SESSION_REPOSITORY],
    },
    {
      provide: DepositToBankUseCase,
      useFactory: (
        repository: GameSessionRepositoryPort,
        ledgerService: LedgerService,
      ) => new DepositToBankUseCase(repository, ledgerService),
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    },
    {
      provide: WithdrawFromBankUseCase,
      useFactory: (
        repository: GameSessionRepositoryPort,
        ledgerService: LedgerService,
      ) => new WithdrawFromBankUseCase(repository, ledgerService),
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    },
    {
      provide: TransferFundsUseCase,
      useFactory: (
        repository: GameSessionRepositoryPort,
        ledgerService: LedgerService,
      ) => new TransferFundsUseCase(repository, ledgerService),
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    },
    {
      provide: PlaceFundsWithBankerUseCase,
      useFactory: (
        repository: GameSessionRepositoryPort,
        ledgerService: LedgerService,
      ) => new PlaceFundsWithBankerUseCase(repository, ledgerService),
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    },
    {
      provide: RedeemFundsFromBankerUseCase,
      useFactory: (
        repository: GameSessionRepositoryPort,
        ledgerService: LedgerService,
      ) => new RedeemFundsFromBankerUseCase(repository, ledgerService),
      inject: [GAME_SESSION_REPOSITORY, LedgerService],
    },
  ];
}
