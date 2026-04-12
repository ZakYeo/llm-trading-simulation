import OpenAI from 'openai';

import { GAME_SESSION_REPOSITORY } from '../../shared/application/tokens.js';
import { PlaceFundsWithBankerUseCase } from '../../game/application/use-cases/place-funds-with-banker.use-case.js';
import { RedeemFundsFromBankerUseCase } from '../../game/application/use-cases/redeem-funds-from-banker.use-case.js';
import { TransferFundsUseCase } from '../../game/application/use-cases/transfer-funds.use-case.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';
import type { GameSessionRepositoryPort } from '../../game/application/ports/game-session-repository.port.js';
import { AgentSessionEventStreamService } from '../application/services/agent-session-event-stream.service.js';
import { AgentActionExecutor } from '../application/services/agent-action-executor.js';
import { AgentActionValidator } from '../application/services/agent-action-validator.js';
import { AgentTurnContextFactory } from '../application/services/agent-turn-context.factory.js';
import { OrchestrateAgentRoundUseCase } from '../application/use-cases/orchestrate-agent-round.use-case.js';
import type { AgentActionRepositoryPort } from '../application/ports/agent-action-repository.port.js';
import type { AgentGatewayPort } from '../application/ports/agent-gateway.port.js';
import type { AgentMessageRepositoryPort } from '../application/ports/agent-message-repository.port.js';
import { MockAgentGateway } from '../infrastructure/mock/mock-agent.gateway.js';
import { OpenAiAgentGateway } from '../infrastructure/openai/openai-agent.gateway.js';
import { PrismaAgentActionRepository } from '../infrastructure/prisma/prisma-agent-action.repository.js';
import { PrismaAgentMessageRepository } from '../infrastructure/prisma/prisma-agent-message.repository.js';
import { RunAgentCommunicationTurnUseCase } from '../application/use-cases/run-agent-communication-turn.use-case.js';

export const AGENT_GATEWAY = Symbol('AGENT_GATEWAY');
export const AGENT_ACTION_REPOSITORY = Symbol('AGENT_ACTION_REPOSITORY');
export const AGENT_MESSAGE_REPOSITORY = Symbol('AGENT_MESSAGE_REPOSITORY');

function createAgentGateway(): AgentGatewayPort {
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
    process.env.OPENAI_AGENT_SYSTEM_PROMPT,
    process.env.OPENAI_AGENT_STRICT_MODE === '1',
  );
}

function createAgentActionRepository(
  prismaService: PrismaService,
): AgentActionRepositoryPort {
  return new PrismaAgentActionRepository(prismaService);
}

function createAgentMessageRepository(
  prismaService: PrismaService,
): AgentMessageRepositoryPort {
  return new PrismaAgentMessageRepository(prismaService);
}

export function createAgentsProviders() {
  return [
    {
      provide: AGENT_GATEWAY,
      useFactory: createAgentGateway,
    },
    {
      provide: AGENT_ACTION_REPOSITORY,
      useFactory: createAgentActionRepository,
      inject: [PrismaService],
    },
    {
      provide: AGENT_MESSAGE_REPOSITORY,
      useFactory: createAgentMessageRepository,
      inject: [PrismaService],
    },
    {
      provide: AgentTurnContextFactory,
      useFactory: () => new AgentTurnContextFactory(),
    },
    {
      provide: AgentActionValidator,
      useFactory: () => new AgentActionValidator(),
    },
    {
      provide: AgentActionExecutor,
      useFactory: (
        agentMessageRepository: AgentMessageRepositoryPort,
        agentActionRepository: AgentActionRepositoryPort,
        placeFundsWithBankerUseCase: PlaceFundsWithBankerUseCase,
        redeemFundsFromBankerUseCase: RedeemFundsFromBankerUseCase,
      ) =>
        new AgentActionExecutor(
          agentMessageRepository,
          agentActionRepository,
          placeFundsWithBankerUseCase,
          redeemFundsFromBankerUseCase,
        ),
      inject: [
        AGENT_MESSAGE_REPOSITORY,
        AGENT_ACTION_REPOSITORY,
        PlaceFundsWithBankerUseCase,
        RedeemFundsFromBankerUseCase,
      ],
    },
    {
      provide: RunAgentCommunicationTurnUseCase,
      useFactory: (
        gameSessionRepository: GameSessionRepositoryPort,
        agentActionRepository: AgentActionRepositoryPort,
        agentMessageRepository: AgentMessageRepositoryPort,
        agentGateway: AgentGatewayPort,
        agentSessionEventStreamService: AgentSessionEventStreamService,
        placeFundsWithBankerUseCase: PlaceFundsWithBankerUseCase,
        redeemFundsFromBankerUseCase: RedeemFundsFromBankerUseCase,
        agentTurnContextFactory: AgentTurnContextFactory,
        agentActionValidator: AgentActionValidator,
        agentActionExecutor: AgentActionExecutor,
      ) =>
        new RunAgentCommunicationTurnUseCase(
          gameSessionRepository,
          agentMessageRepository,
          agentActionRepository,
          agentGateway,
          agentSessionEventStreamService,
          placeFundsWithBankerUseCase,
          redeemFundsFromBankerUseCase,
          agentTurnContextFactory,
          agentActionValidator,
          agentActionExecutor,
        ),
      inject: [
        GAME_SESSION_REPOSITORY,
        AGENT_ACTION_REPOSITORY,
        AGENT_MESSAGE_REPOSITORY,
        AGENT_GATEWAY,
        AgentSessionEventStreamService,
        PlaceFundsWithBankerUseCase,
        RedeemFundsFromBankerUseCase,
        AgentTurnContextFactory,
        AgentActionValidator,
        AgentActionExecutor,
      ],
    },
    {
      provide: OrchestrateAgentRoundUseCase,
      useFactory: (
        agentActionRepository: AgentActionRepositoryPort,
        runAgentCommunicationTurnUseCase: RunAgentCommunicationTurnUseCase,
        transferFundsUseCase: TransferFundsUseCase,
        agentSessionEventStreamService: AgentSessionEventStreamService,
      ) =>
        new OrchestrateAgentRoundUseCase(
          agentActionRepository,
          runAgentCommunicationTurnUseCase,
          transferFundsUseCase,
          agentSessionEventStreamService,
        ),
      inject: [
        AGENT_ACTION_REPOSITORY,
        RunAgentCommunicationTurnUseCase,
        TransferFundsUseCase,
        AgentSessionEventStreamService,
      ],
    },
  ];
}
