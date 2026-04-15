import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { MarketOpportunity } from '../../domain/entities/market-opportunity.js';
import type { MarketPosition } from '../../domain/entities/market-position.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';
import { MarketOpportunityBoardFactory } from '../services/market-opportunity-board.factory.js';

export interface AdvanceGameRoundInput {
  gameSessionId: string;
  interestRateBps?: number;
}

export class AdvanceGameRoundUseCase {
  constructor(
    private readonly repository: GameSessionRepositoryPort,
    private readonly defaultInterestRateBps = 250,
    private readonly marketOpportunityBoardFactory = new MarketOpportunityBoardFactory(),
  ) {}

  async execute(input: AdvanceGameRoundInput) {
    const session = await this.repository.findById(input.gameSessionId);

    if (!session) {
      throw new DomainInvariantError('Game session not found.');
    }

    if (this.defaultInterestRateBps < 0) {
      throw new DomainInvariantError(
        'Default interest rate cannot be negative.',
      );
    }

    const interestRateBps =
      input.interestRateBps ?? this.defaultInterestRateBps;

    if (interestRateBps < 0) {
      throw new DomainInvariantError('Interest rate cannot be negative.');
    }

    const accruedPositions = session.bankerCustodyPositions.map((position) =>
      position.accrue(interestRateBps),
    );
    const accrualHistory = session.bankerCustodyPositions.flatMap(
      (position, index) => {
        const accruedPosition = accruedPositions[index];

        if (!accruedPosition) {
          return [];
        }

        const interest = accruedPosition.accruedInterest.subtract(
          position.accruedInterest,
        );

        return interest.isZero()
          ? []
          : [
              {
                gameSessionId: session.id,
                roundNumber: session.currentRound + 1,
                bankerAgentId: position.bankerAgentId,
                ownerAgentId: position.ownerAgentId,
                amount: interest.toDecimal(),
              },
            ];
      },
    );

    const interestByBanker = new Map<string, Money>();

    session.bankerCustodyPositions.forEach((position, index) => {
      const accruedPosition = accruedPositions[index];

      if (!accruedPosition) {
        return;
      }

      const interest = accruedPosition.accruedInterest.subtract(
        position.accruedInterest,
      );

      if (interest.isZero()) {
        return;
      }

      interestByBanker.set(
        position.bankerAgentId,
        (interestByBanker.get(position.bankerAgentId) ?? Money.zero()).add(
          interest,
        ),
      );
    });

    let updatedSession = session
      .withAgents(
        session.agents.map((agent) => {
          const accruedInterest = interestByBanker.get(agent.id);

          return agent.withAccounts(
            accruedInterest
              ? agent.balance.credit(accruedInterest)
              : agent.balance,
            agent.depositAccount,
          );
        }),
      )
      .withBankerCustodyPositions(accruedPositions);

    const nextRound = session.currentRound + 1;
    const settledMarketHistory = session.marketPositions.flatMap((position) => {
      if (position.settlementRound !== nextRound) {
        return [];
      }

      const opportunity = session.marketOpportunities.find(
        (candidate) => candidate.id === position.opportunityId,
      );

      if (!opportunity) {
        throw new DomainInvariantError(
          'Market position must reference an existing opportunity at settlement.',
        );
      }

      const ownerAgent = updatedSession.agents.find(
        (agent) => agent.id === position.ownerAgentId,
      );

      if (!ownerAgent) {
        throw new DomainInvariantError(
          'Market position owner must exist at settlement.',
        );
      }

      const resolutionReturnBps = position.effectiveResolutionReturnBps;
      const absoluteProfitOrLoss = position.principal.multiplyBps(
        Math.abs(resolutionReturnBps),
      );
      const profitOrLoss =
        resolutionReturnBps >= 0
          ? absoluteProfitOrLoss
          : Money.zero().subtract(absoluteProfitOrLoss);
      const releasedBalance = ownerAgent.balance.release(position.principal);
      const settledBalance = profitOrLoss.isNegative()
        ? releasedBalance.debit(Money.zero().subtract(profitOrLoss))
        : releasedBalance.credit(profitOrLoss);

      updatedSession = updatedSession.withAgents(
        updatedSession.agents.map((agent) =>
          agent.id === ownerAgent.id
            ? agent.withAccounts(settledBalance, agent.depositAccount)
            : agent,
        ),
      );

      return [
        {
          type: 'market_position_settled' as const,
          gameSessionId: session.id,
          roundNumber: nextRound,
          opportunityId: position.opportunityId,
          opportunityTitle: position.opportunityTitle,
          ownerAgentId: position.ownerAgentId,
          principal: position.principal.toDecimal(),
          profitOrLoss: profitOrLoss.toDecimal(),
        },
      ];
    });

    const resolvedMarketHistory = session.marketOpportunities
      .filter((opportunity) => opportunity.settlementRound === nextRound)
      .map((opportunity) =>
        AdvanceGameRoundUseCase.toMarketOpportunityResolvedHistory(
          session.id,
          nextRound,
          opportunity,
          session.marketPositions.filter(
            (position) => position.opportunityId === opportunity.id,
          ),
          settledMarketHistory.filter(
            (record) => record.opportunityId === opportunity.id,
          ),
        ),
      );
    const remainingMarketPositions = session.marketPositions.filter(
      (position) => position.settlementRound !== nextRound,
    );
    const remainingMarketOpportunities = session.marketOpportunities.filter(
      (opportunity) => opportunity.settlementRound > nextRound,
    );
    const marketOpportunityAdditions =
      this.marketOpportunityBoardFactory.createRoundAdvanceAdditions(
        session.id,
        nextRound,
        remainingMarketOpportunities,
      );

    updatedSession = updatedSession
      .withMarketPositions(remainingMarketPositions)
      .withMarketOpportunities([
        ...remainingMarketOpportunities,
        ...marketOpportunityAdditions,
      ])
      .advanceRound();

    await this.repository.save(updatedSession, [
      ...accrualHistory.map((record) => ({
        type: 'custody_accrual' as const,
        ...record,
      })),
      ...settledMarketHistory,
      ...resolvedMarketHistory,
      ...marketOpportunityAdditions.map((opportunity) =>
        AdvanceGameRoundUseCase.toMarketOpportunityListedHistory(
          session.id,
          nextRound,
          opportunity,
        ),
      ),
    ]);

    return updatedSession;
  }

  private static toMarketOpportunityListedHistory(
    gameSessionId: string,
    roundNumber: number,
    opportunity: MarketOpportunity,
  ) {
    return {
      type: 'market_opportunity_listed' as const,
      gameSessionId,
      roundNumber,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      opportunityCategory: opportunity.category,
      opportunitySummary: opportunity.summary,
      opportunityRiskLevel: opportunity.riskLevel,
      listedRound: opportunity.listedRound,
      settlementRound: opportunity.settlementRound,
      minCommitment: opportunity.minCommitment,
      maxCommitment: opportunity.maxCommitment,
      estimatedNetReturnBps: opportunity.estimatedNetReturnBps,
      worstCaseReturnBps: opportunity.worstCaseReturnBps,
      bestCaseReturnBps: opportunity.bestCaseReturnBps,
    };
  }

  private static toMarketOpportunityResolvedHistory(
    gameSessionId: string,
    roundNumber: number,
    opportunity: MarketOpportunity,
    settledPositions: MarketPosition[],
    settlements: Array<{
      principal: string;
      profitOrLoss: string;
    }>,
  ) {
    const totalPrincipal = settledPositions.reduce(
      (sum, position) => sum.add(position.principal),
      Money.zero(),
    );
    const totalProfitOrLoss = settlements.reduce(
      (sum, settlement) => sum.add(Money.fromDecimal(settlement.profitOrLoss)),
      Money.zero(),
    );

    return {
      type: 'market_opportunity_resolved' as const,
      gameSessionId,
      roundNumber,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      opportunityCategory: opportunity.category,
      opportunitySummary: opportunity.summary,
      opportunityRiskLevel: opportunity.riskLevel,
      listedRound: opportunity.listedRound,
      settlementRound: opportunity.settlementRound,
      minCommitment: opportunity.minCommitment,
      maxCommitment: opportunity.maxCommitment,
      estimatedNetReturnBps: opportunity.estimatedNetReturnBps,
      worstCaseReturnBps: opportunity.worstCaseReturnBps,
      bestCaseReturnBps: opportunity.bestCaseReturnBps,
      participantCount: settledPositions.length,
      totalPrincipal: totalPrincipal.toDecimal(),
      totalProfitOrLoss: totalProfitOrLoss.toDecimal(),
    };
  }
}
