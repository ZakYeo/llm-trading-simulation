import { Body, Controller, Inject, Param, Post } from '@nestjs/common';

import { OrchestrateAgentRoundUseCase } from '../../application/use-cases/orchestrate-agent-round.use-case.js';
import { RunAgentCommunicationTurnUseCase } from '../../application/use-cases/run-agent-communication-turn.use-case.js';
import { orchestrateAgentRoundRequestSchema } from './schemas/orchestrate-agent-round.request.js';

@Controller('agents')
export class AgentsController {
  constructor(
    @Inject(OrchestrateAgentRoundUseCase)
    private readonly orchestrateAgentRoundUseCase: OrchestrateAgentRoundUseCase,
    @Inject(RunAgentCommunicationTurnUseCase)
    private readonly runAgentCommunicationTurnUseCase: RunAgentCommunicationTurnUseCase,
  ) {}

  @Post('sessions/:gameSessionId/turns/communicate')
  async runCommunicationTurn(@Param('gameSessionId') gameSessionId: string) {
    return this.runAgentCommunicationTurnUseCase.execute({ gameSessionId });
  }

  @Post('sessions/:gameSessionId/rounds/orchestrate')
  async orchestrateRound(
    @Param('gameSessionId') gameSessionId: string,
    @Body() body: unknown,
  ) {
    const request = orchestrateAgentRoundRequestSchema.parse(body);

    return this.orchestrateAgentRoundUseCase.execute({
      gameSessionId,
      turnCount: request.turnCount,
    });
  }
}
