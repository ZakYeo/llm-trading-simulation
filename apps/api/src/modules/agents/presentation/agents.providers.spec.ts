import { afterEach, describe, expect, it } from 'vitest';

import { PlaceFundsWithBankerUseCase } from '../../game/application/use-cases/place-funds-with-banker.use-case.js';
import { RedeemFundsFromBankerUseCase } from '../../game/application/use-cases/redeem-funds-from-banker.use-case.js';
import { TransferFundsUseCase } from '../../game/application/use-cases/transfer-funds.use-case.js';
import { GAME_SESSION_REPOSITORY } from '../../shared/application/tokens.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';
import { AgentActionExecutor } from '../application/services/agent-action-executor.js';
import { AgentActionValidator } from '../application/services/agent-action-validator.js';
import { AgentSessionEventStreamService } from '../application/services/agent-session-event-stream.service.js';
import { AgentTurnContextFactory } from '../application/services/agent-turn-context.factory.js';
import { OrchestrateAgentRoundUseCase } from '../application/use-cases/orchestrate-agent-round.use-case.js';
import { RunAgentCommunicationTurnUseCase } from '../application/use-cases/run-agent-communication-turn.use-case.js';
import { MockAgentGateway } from '../infrastructure/mock/mock-agent.gateway.js';
import { OpenAiAgentGateway } from '../infrastructure/openai/openai-agent.gateway.js';
import {
  AGENT_ACTION_REPOSITORY,
  AGENT_GATEWAY,
  AGENT_MESSAGE_REPOSITORY,
  createAgentsProviders,
} from './agents.providers.js';

type ClassProviderToken = abstract new (...args: never[]) => unknown;

interface FactoryProvider {
  provide: symbol | ClassProviderToken;
  useFactory: (...args: unknown[]) => unknown;
  inject?: unknown[];
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

describe('createAgentsProviders', () => {
  const originalEnv = {
    AGENT_RUNTIME_PROVIDER: process.env.AGENT_RUNTIME_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_AGENT_SYSTEM_PROMPT: process.env.OPENAI_AGENT_SYSTEM_PROMPT,
    OPENAI_AGENT_STRICT_MODE: process.env.OPENAI_AGENT_STRICT_MODE,
  };

  afterEach(() => {
    process.env.AGENT_RUNTIME_PROVIDER = originalEnv.AGENT_RUNTIME_PROVIDER;
    process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;
    process.env.OPENAI_MODEL = originalEnv.OPENAI_MODEL;
    process.env.OPENAI_AGENT_SYSTEM_PROMPT =
      originalEnv.OPENAI_AGENT_SYSTEM_PROMPT;
    process.env.OPENAI_AGENT_STRICT_MODE = originalEnv.OPENAI_AGENT_STRICT_MODE;
  });

  it('registers the expected providers and dependencies', () => {
    const providers = createAgentsProviders();

    expect(providers).toHaveLength(8);
    expect(providers[0]).toMatchObject({
      provide: AGENT_GATEWAY,
    });
    expect(providers[1]).toMatchObject({
      provide: AGENT_ACTION_REPOSITORY,
      inject: [PrismaService],
    });
    expect(providers[2]).toMatchObject({
      provide: AGENT_MESSAGE_REPOSITORY,
      inject: [PrismaService],
    });
    expect(providers[3]).toMatchObject({
      provide: AgentTurnContextFactory,
    });
    expect(providers[4]).toMatchObject({
      provide: AgentActionValidator,
    });
    expect(providers[5]).toMatchObject({
      provide: AgentActionExecutor,
      inject: [
        AGENT_MESSAGE_REPOSITORY,
        AGENT_ACTION_REPOSITORY,
        PlaceFundsWithBankerUseCase,
        RedeemFundsFromBankerUseCase,
      ],
    });
    expect(providers[6]).toMatchObject({
      provide: RunAgentCommunicationTurnUseCase,
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
    });
    expect(providers[7]).toMatchObject({
      provide: OrchestrateAgentRoundUseCase,
      inject: [
        AGENT_ACTION_REPOSITORY,
        RunAgentCommunicationTurnUseCase,
        TransferFundsUseCase,
        AgentSessionEventStreamService,
      ],
    });
  });

  it('builds a mock gateway when mock mode is configured', () => {
    process.env.AGENT_RUNTIME_PROVIDER = 'mock';
    delete process.env.OPENAI_API_KEY;

    const gatewayProvider = expectFactoryProvider(createAgentsProviders()[0]);
    const gateway = gatewayProvider.useFactory();

    expect(gateway).toBeInstanceOf(MockAgentGateway);
  });

  it('builds an openai gateway when an api key is available', () => {
    delete process.env.AGENT_RUNTIME_PROVIDER;
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-5.2';
    process.env.OPENAI_AGENT_SYSTEM_PROMPT = 'test prompt';
    process.env.OPENAI_AGENT_STRICT_MODE = '1';

    const gatewayProvider = expectFactoryProvider(createAgentsProviders()[0]);
    const gateway = gatewayProvider.useFactory();

    expect(gateway).toBeInstanceOf(OpenAiAgentGateway);
  });
});
