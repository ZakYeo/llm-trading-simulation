import type { RoundSummaryRecord } from '@llm-sim/shared-types';
import type { ReplayReadModelPort } from '../../../replay/application/ports/replay-read-model.port.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type {
  RoundSummaryGatewayPort,
  RoundSummaryRepositoryPort,
} from '../ports/round-summary.port.js';

export class GenerateRoundSummaryUseCase {
  constructor(
    private readonly replay: ReplayReadModelPort,
    private readonly gateway: RoundSummaryGatewayPort,
    private readonly repository: RoundSummaryRepositoryPort,
  ) {}
  async execute(input: {
    gameSessionId: string;
    roundNumber: number;
  }): Promise<RoundSummaryRecord> {
    const replay = await this.replay.findByGameSessionId(input.gameSessionId);
    if (!replay) throw new DomainInvariantError('Game replay not found.');
    const events = replay.events.filter(
      (event) => event.roundNumber === input.roundNumber,
    );
    const included = events.slice(-200);
    let text: string | null = null;
    try {
      const generated = (
        await this.gateway.generate({
          roundNumber: input.roundNumber,
          totalEventCount: events.length,
          events: included,
        })
      ).trim();
      if (generated.length > 0 && generated.length <= 2400) text = generated;
    } catch {
      // Summary generation is optional; recorded simulation actions remain authoritative.
    }
    const summary: RoundSummaryRecord = {
      ...input,
      text,
      status: text === null ? 'unavailable' : 'ready',
      provider: this.gateway.provider,
      eventCount: events.length,
      includedEventCount: included.length,
      generatedAt: new Date().toISOString(),
    };
    await this.repository.save(summary);
    return summary;
  }
}
