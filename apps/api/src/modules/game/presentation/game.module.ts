import { Module } from '@nestjs/common';

import { GameController } from './rest/game.controller.js';

@Module({
  controllers: [GameController],
})
export class GameModule {}
