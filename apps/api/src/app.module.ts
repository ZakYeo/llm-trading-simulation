import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BankModule } from './modules/bank/presentation/bank.module.js';
import { GameModule } from './modules/game/presentation/game.module.js';
import { ReplayModule } from './modules/replay/presentation/replay.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GameModule,
    BankModule,
    ReplayModule,
  ],
})
export class AppModule {}
