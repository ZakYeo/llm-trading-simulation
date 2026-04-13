import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';

export interface AdvanceGameRoundInput {
  gameSessionId: string;
  interestRateBps?: number;
}

export class AdvanceGameRoundUseCase {
  constructor(
    private readonly repository: GameSessionRepositoryPort,
    private readonly defaultInterestRateBps = 250,
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

    const updatedSession = session
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
      .withBankerCustodyPositions(accruedPositions)
      .advanceRound();

    await this.repository.save(
      updatedSession,
      accrualHistory.map((record) => ({
        type: 'custody_accrual' as const,
        ...record,
      })),
    );

    return updatedSession;
  }
}
