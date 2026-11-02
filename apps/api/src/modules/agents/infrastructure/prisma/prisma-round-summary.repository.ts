import type { RoundSummaryRecord } from '@llm-sim/shared-types';
import type { PrismaClient } from '../../../shared/infrastructure/prisma/prisma-client.js';
import type { RoundSummaryRepositoryPort } from '../../application/ports/round-summary.port.js';

export class PrismaRoundSummaryRepository implements RoundSummaryRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}
  async find(
    gameSessionId: string,
    roundNumber: number,
  ): Promise<RoundSummaryRecord | null> {
    const row = await this.prisma.roundSummary.findUnique({
      where: { gameSessionId_roundNumber: { gameSessionId, roundNumber } },
    });
    return row
      ? {
          ...row,
          status: row.status === 'READY' ? 'ready' : 'unavailable',
          provider: row.provider === 'OPENAI' ? 'openai' : 'mock',
          generatedAt: row.generatedAt.toISOString(),
        }
      : null;
  }
  async save(summary: RoundSummaryRecord): Promise<void> {
    const data = {
      ...summary,
      status:
        summary.status === 'ready'
          ? ('READY' as const)
          : ('UNAVAILABLE' as const),
      provider:
        summary.provider === 'openai' ? ('OPENAI' as const) : ('MOCK' as const),
      generatedAt: new Date(summary.generatedAt),
    };
    const where = {
      gameSessionId_roundNumber: {
        gameSessionId: summary.gameSessionId,
        roundNumber: summary.roundNumber,
      },
    };
    // Create if absent, then atomically reject older snapshots finishing out of order.
    await this.prisma.roundSummary.upsert({ where, create: data, update: {} });
    await this.prisma.roundSummary.updateMany({
      where: {
        gameSessionId: summary.gameSessionId,
        roundNumber: summary.roundNumber,
        eventCount: { lte: summary.eventCount },
      },
      data,
    });
  }
}
