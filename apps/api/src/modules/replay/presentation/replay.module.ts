import { Module } from '@nestjs/common';

import { createReplayProviders } from './replay.providers.js';
import { ReplayController } from './rest/replay.controller.js';

@Module({
  controllers: [ReplayController],
  providers: [...createReplayProviders()],
})
export class ReplayModule {}
