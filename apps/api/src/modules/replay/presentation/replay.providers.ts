import { GetGameReplayUseCase } from '../application/use-cases/get-game-replay.use-case.js';
import { PrismaReplayReadModel } from '../infrastructure/prisma/prisma-replay-read-model.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

export function createReplayProviders() {
  return [
    PrismaService,
    {
      provide: PrismaReplayReadModel,
      useFactory: (prismaService: PrismaService) =>
        new PrismaReplayReadModel(prismaService),
      inject: [PrismaService],
    },
    {
      provide: GetGameReplayUseCase,
      useFactory: (replayReadModel: PrismaReplayReadModel) =>
        new GetGameReplayUseCase(replayReadModel),
      inject: [PrismaReplayReadModel],
    },
  ];
}
