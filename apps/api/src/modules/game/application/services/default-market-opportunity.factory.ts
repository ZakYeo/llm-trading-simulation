import { MarketOpportunity } from '../../domain/entities/market-opportunity.js';

export class DefaultMarketOpportunityFactory {
  createForRound(
    gameSessionId: string,
    listedRound: number,
  ): MarketOpportunity[] {
    return [
      new MarketOpportunity({
        id: `${gameSessionId}-bad-opportunity-r${listedRound}`,
        title: 'Crowded Carry Trap',
        summary:
          'A crowded carry trade with weak edge, thin upside, and persistent drag. This is intentionally a poor use of capital.',
        riskLevel: 'low',
        listedRound,
        settlementRound: listedRound + 1,
        minCommitment: '5.0000',
        maxCommitment: '20.0000',
        estimatedNetReturnBps: -75,
        worstCaseReturnBps: -150,
        bestCaseReturnBps: 25,
        resolutionReturnBps: -100,
      }),
      new MarketOpportunity({
        id: `${gameSessionId}-risky-opportunity-r${listedRound}`,
        title: 'Binary Event Volatility',
        summary:
          'A one-round event-driven volatility trade with meaningful upside and real downside. Higher expected value than passive custody, but far less safety.',
        riskLevel: 'high',
        listedRound,
        settlementRound: listedRound + 1,
        minCommitment: '5.0000',
        maxCommitment: '25.0000',
        estimatedNetReturnBps: 300,
        worstCaseReturnBps: -800,
        bestCaseReturnBps: 1200,
        resolutionReturnBps: listedRound % 2 === 0 ? 1200 : -800,
      }),
    ];
  }
}
