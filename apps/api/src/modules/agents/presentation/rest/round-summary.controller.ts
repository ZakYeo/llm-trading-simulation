import { Controller, Get, Inject, Param } from '@nestjs/common';
import { z } from 'zod';
import type { RoundSummaryRepositoryPort } from '../../application/ports/round-summary.port.js';
import { ROUND_SUMMARY_REPOSITORY } from '../round-summary.providers.js';
const roundNumberSchema = z.coerce.number().int().positive().max(2147483647);

@Controller('agents')
export class RoundSummaryController {
  constructor(
    @Inject(ROUND_SUMMARY_REPOSITORY)
    private readonly repository: RoundSummaryRepositoryPort,
  ) {}
  @Get('sessions/:gameSessionId/rounds/:roundNumber/summary')
  async get(
    @Param('gameSessionId') gameSessionId: string,
    @Param('roundNumber') roundNumber: string,
  ) {
    return {
      summary: await this.repository.find(
        gameSessionId,
        roundNumberSchema.parse(roundNumber),
      ),
    };
  }
}
