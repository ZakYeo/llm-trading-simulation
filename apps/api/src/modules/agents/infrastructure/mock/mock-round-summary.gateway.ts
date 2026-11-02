import type {
  RoundSummaryGatewayPort,
  RoundSummaryInput,
} from '../../application/ports/round-summary.port.js';

export class MockRoundSummaryGateway implements RoundSummaryGatewayPort {
  readonly provider = 'mock' as const;
  async generate(input: RoundSummaryInput): Promise<string> {
    const counts = new Map<string, number>();
    for (const event of input.events)
      counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    const activity = [...counts]
      .map(
        ([type, count]) =>
          `${count} ${type.replaceAll('_', ' ')} event${count === 1 ? '' : 's'}`,
      )
      .join(', ');
    return `Round ${input.roundNumber} recorded ${input.totalEventCount} event${input.totalEventCount === 1 ? '' : 's'}. ${input.events.length < input.totalEventCount ? `The most recent ${input.events.length} records include` : 'Recorded activity includes'} ${activity || 'no activity'}. Communication turns stay within the round; settlement requires explicit advancement.`;
  }
}
