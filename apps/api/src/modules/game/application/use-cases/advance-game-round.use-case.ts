import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';
import { DefaultMarketOpportunityFactory } from '../services/default-market-opportunity.factory.js';

export interface AdvanceGameRoundInput {
  gameSessionId: string;
  interestRateBps?: number;
}

export class AdvanceGameRoundUseCase {
  constructor(
    private readonly repository: GameSessionRepositoryPort,
    private readonly defaultInterestRateBps = 250,
    private readonly marketOpportunityFactory = new DefaultMarketOpportunityFactory(),
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

    const settledMarketHistory = session.marketPositions.flatMap((position) => {
      if (position.settlementRound !== session.currentRound + 1) {
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

      const absoluteProfitOrLoss = position.principal.multiplyBps(
        Math.abs(opportunity.resolutionReturnBps),
      );
      const profitOrLoss =
        opportunity.resolutionReturnBps >= 0
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
          roundNumber: session.currentRound + 1,
          opportunityId: position.opportunityId,
          opportunityTitle: position.opportunityTitle,
          ownerAgentId: position.ownerAgentId,
          principal: position.principal.toDecimal(),
          profitOrLoss: profitOrLoss.toDecimal(),
        },
      ];
    });

    updatedSession = updatedSession
      .withMarketPositions(
        session.marketPositions.filter(
          (position) => position.settlementRound !== session.currentRound + 1,
        ),
      )
      .advanceRound()
      .withMarketOpportunities(
        this.marketOpportunityFactory.createForRound(
          session.id,
          session.currentRound + 1,
        ),
      );

    await this.repository.save(updatedSession, [
      ...accrualHistory.map((record) => ({
        type: 'custody_accrual' as const,
        ...record,
      })),
      ...settledMarketHistory,
    ]);

    return updatedSession;
  }
}
