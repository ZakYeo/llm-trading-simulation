import { Controller, Get, Inject, Param } from '@nestjs/common';

import { GetGameReplayUseCase } from '../../application/use-cases/get-game-replay.use-case.js';

@Controller('replay')
export class ReplayController {
  constructor(
    @Inject(GetGameReplayUseCase)
    private readonly getGameReplayUseCase: GetGameReplayUseCase,
  ) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'replay',
    };
  }

  @Get('sessions/:gameSessionId')
  async getReplay(@Param('gameSessionId') gameSessionId: string) {
    return this.getGameReplayUseCase.execute({ gameSessionId });
  }
}
