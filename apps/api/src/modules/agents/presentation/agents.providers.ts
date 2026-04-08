import OpenAI from 'openai';

import { GAME_SESSION_REPOSITORY } from '../../shared/application/tokens.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';
import type { GameSessionRepositoryPort } from '../../game/application/ports/game-session-repository.port.js';
import { MockAgentGateway } from '../infrastructure/mock/mock-agent.gateway.js';
import { OpenAiAgentGateway } from '../infrastructure/openai/openai-agent.gateway.js';
import { PrismaAgentMessageRepository } from '../infrastructure/prisma/prisma-agent-message.repository.js';
import { RunAgentCommunicationTurnUseCase } from '../application/use-cases/run-agent-communication-turn.use-case.js';

export const AGENT_GATEWAY = Symbol('AGENT_GATEWAY');
export const AGENT_MESSAGE_REPOSITORY = Symbol('AGENT_MESSAGE_REPOSITORY');

export function createAgentsProviders() {
  return [
    {
      provide: AGENT_GATEWAY,
      useFactory: () => {
        if (
          process.env.AGENT_RUNTIME_PROVIDER === 'mock' ||
          !process.env.OPENAI_API_KEY
        ) {
          return new MockAgentGateway();
        }

        return new OpenAiAgentGateway(
          new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          }),
          process.env.OPENAI_MODEL ?? 'gpt-5.2',
        );
      },
    },
    {
      provide: AGENT_MESSAGE_REPOSITORY,
      useFactory: (prismaService: PrismaService) =>
        new PrismaAgentMessageRepository(prismaService),
      inject: [PrismaService],
    },
    {
      provide: RunAgentCommunicationTurnUseCase,
      useFactory: (
        gameSessionRepository: GameSessionRepositoryPort,
        agentMessageRepository: PrismaAgentMessageRepository,
        agentGateway: MockAgentGateway | OpenAiAgentGateway,
      ) =>
        new RunAgentCommunicationTurnUseCase(
          gameSessionRepository,
          agentMessageRepository,
          agentGateway,
        ),
      inject: [
        GAME_SESSION_REPOSITORY,
        AGENT_MESSAGE_REPOSITORY,
        AGENT_GATEWAY,
      ],
    },
  ];
}
