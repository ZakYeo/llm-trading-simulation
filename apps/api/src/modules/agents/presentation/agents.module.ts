import { Module } from '@nestjs/common';

import { GameModule } from '../../game/presentation/game.module.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';
import { createAgentsProviders } from './agents.providers.js';
import { AgentsController } from './rest/agents.controller.js';

@Module({
  imports: [GameModule],
  controllers: [AgentsController],
  providers: [PrismaService, ...createAgentsProviders()],
})
export class AgentsModule {}
