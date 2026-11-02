import OpenAI from 'openai';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';
import { PrismaReplayReadModel } from '../../replay/infrastructure/prisma/prisma-replay-read-model.js';
import { GenerateRoundSummaryUseCase } from '../application/use-cases/generate-round-summary.use-case.js';
import type {
  RoundSummaryGatewayPort,
  RoundSummaryRepositoryPort,
} from '../application/ports/round-summary.port.js';
import { MockRoundSummaryGateway } from '../infrastructure/mock/mock-round-summary.gateway.js';
import { OpenAiRoundSummaryGateway } from '../infrastructure/openai/openai-round-summary.gateway.js';
import { PrismaRoundSummaryRepository } from '../infrastructure/prisma/prisma-round-summary.repository.js';

export const ROUND_SUMMARY_REPOSITORY = Symbol('ROUND_SUMMARY_REPOSITORY');
export const ROUND_SUMMARY_GATEWAY = Symbol('ROUND_SUMMARY_GATEWAY');
export function createRoundSummaryProviders() {
  return [
    {
      provide: ROUND_SUMMARY_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaRoundSummaryRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: ROUND_SUMMARY_GATEWAY,
      useFactory: (): RoundSummaryGatewayPort =>
        process.env.AGENT_RUNTIME_PROVIDER === 'mock' ||
        !process.env.OPENAI_API_KEY
          ? new MockRoundSummaryGateway()
          : new OpenAiRoundSummaryGateway(
              new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
              process.env.OPENAI_MODEL ?? 'gpt-5.2',
            ),
    },
    {
      provide: GenerateRoundSummaryUseCase,
      useFactory: (
        prisma: PrismaService,
        gateway: RoundSummaryGatewayPort,
        repository: RoundSummaryRepositoryPort,
      ) =>
        new GenerateRoundSummaryUseCase(
          new PrismaReplayReadModel(prisma),
          gateway,
          repository,
        ),
      inject: [PrismaService, ROUND_SUMMARY_GATEWAY, ROUND_SUMMARY_REPOSITORY],
    },
  ];
}
