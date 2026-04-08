import { Controller, Inject, Param, Post } from '@nestjs/common';

import { RunAgentCommunicationTurnUseCase } from '../../application/use-cases/run-agent-communication-turn.use-case.js';

@Controller('agents')
export class AgentsController {
  constructor(
    @Inject(RunAgentCommunicationTurnUseCase)
    private readonly runAgentCommunicationTurnUseCase: RunAgentCommunicationTurnUseCase,
  ) {}

  @Post('sessions/:gameSessionId/turns/communicate')
  async runCommunicationTurn(@Param('gameSessionId') gameSessionId: string) {
    return this.runAgentCommunicationTurnUseCase.execute({ gameSessionId });
  }
}
