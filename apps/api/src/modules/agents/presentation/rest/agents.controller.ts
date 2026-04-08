import {
  Body,
  Controller,
  Inject,
  MessageEvent,
  Param,
  Post,
  Sse,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';

import { AgentSessionEventStreamService } from '../../application/services/agent-session-event-stream.service.js';
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
    private readonly agentSessionEventStreamService: AgentSessionEventStreamService,
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

  @Sse('sessions/:gameSessionId/events')
  streamSessionEvents(
    @Param('gameSessionId') gameSessionId: string,
  ): Observable<MessageEvent> {
    return this.agentSessionEventStreamService
      .streamForGameSession(gameSessionId)
      .pipe(
        map((event) => ({
          type: event.type,
          data: event,
        })),
      );
  }
}
