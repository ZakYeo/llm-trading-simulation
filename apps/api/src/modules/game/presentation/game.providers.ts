import type { IdGeneratorPort } from '../../shared/application/ports/id-generator.port.js';
import { LedgerService } from '../domain/services/ledger.service.js';
import type { GameSessionRepositoryPort } from '../application/ports/game-session-repository.port.js';
import { PrismaGameSessionRepository } from '../infrastructure/prisma/prisma-game-session.repository.js';
import { CreateGameSessionUseCase } from '../application/use-cases/create-game-session.use-case.js';
import { DepositToBankUseCase } from '../application/use-cases/deposit-to-bank.use-case.js';
import { WithdrawFromBankUseCase } from '../application/use-cases/withdraw-from-bank.use-case.js';
import { TransferFundsUseCase } from '../application/use-cases/transfer-funds.use-case.js';
import {
  GAME_SESSION_REPOSITORY,
  ID_GENERATOR,
} from '../../shared/application/tokens.js';
import { RandomIdGenerator } from '../../shared/infrastructure/id/random-id-generator.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

export function createGameProviders() {
  return [
    PrismaService,
    LedgerService,
    {
      provide: GAME_SESSION_REPOSITORY,
      useFactory: (prismaService: PrismaService) =>
        new PrismaGameSessionRepository(prismaService),
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
  ];
}
