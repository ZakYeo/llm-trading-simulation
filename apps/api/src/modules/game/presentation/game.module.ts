import { Module } from '@nestjs/common';

import { createGameProviders } from './game.providers.js';
import { GameController } from './rest/game.controller.js';

@Module({
  controllers: [GameController],
  providers: [...createGameProviders()],
  exports: [...createGameProviders()],
})
export class GameModule {}
