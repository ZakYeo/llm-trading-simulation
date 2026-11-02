import { RoundSummaryController } from './rest/round-summary.controller.js';
import { createRoundSummaryProviders } from './round-summary.providers.js';
import { Module } from '@nestjs/common';

import { GameModule } from '../../game/presentation/game.module.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';
import { AgentSessionEventStreamService } from '../application/services/agent-session-event-stream.service.js';
import { createAgentsProviders } from './agents.providers.js';
import { AgentsController } from './rest/agents.controller.js';

@Module({
  imports: [GameModule],
  controllers: [AgentsController, RoundSummaryController],
  providers: [
    PrismaService,
    AgentSessionEventStreamService,
    ...createAgentsProviders(),
    ...createRoundSummaryProviders(),
  ],
})
export class AgentsModule {}
