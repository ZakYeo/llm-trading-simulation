import { Body, Controller, Inject, Get, Post } from '@nestjs/common';

import { CreateGameSessionUseCase } from '../../application/use-cases/create-game-session.use-case.js';
import { createGameSessionRequestSchema } from './schemas/create-game-session.request.js';

@Controller('game')
export class GameController {
  constructor(
    @Inject(CreateGameSessionUseCase)
    private readonly createGameSessionUseCase: CreateGameSessionUseCase,
  ) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'game',
    };
  }

  @Post('sessions')
  async createSession(@Body() body: unknown) {
    const request = createGameSessionRequestSchema.parse(body);
    const session = await this.createGameSessionUseCase.execute(request);

    return {
      id: session.id,
      name: session.name,
      status: session.status,
      currentRound: session.currentRound,
      agents: session.agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        availableBalance: agent.balance.available.toDecimal(),
        reservedBalance: agent.balance.reserved.toDecimal(),
        depositPrincipal: agent.depositAccount.principal.toDecimal(),
        depositAccruedInterest:
          agent.depositAccount.accruedInterest.toDecimal(),
      })),
    };
  }
}
