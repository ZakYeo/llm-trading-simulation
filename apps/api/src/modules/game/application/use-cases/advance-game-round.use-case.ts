import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';

export interface AdvanceGameRoundInput {
  gameSessionId: string;
  interestRateBps: number;
}

export class AdvanceGameRoundUseCase {
  constructor(private readonly repository: GameSessionRepositoryPort) {}

  async execute(input: AdvanceGameRoundInput) {
    const session = await this.repository.findById(input.gameSessionId);

    if (!session) {
      throw new DomainInvariantError('Game session not found.');
    }

    if (input.interestRateBps < 0) {
      throw new DomainInvariantError('Interest rate cannot be negative.');
    }

    const accruedPositions = session.bankerCustodyPositions.map((position) =>
      position.accrue(input.interestRateBps),
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

    if (accrualHistory.length > 0) {
      await this.repository.saveWithCustodyAccruals(
        updatedSession,
        accrualHistory,
      );
    } else {
      await this.repository.save(updatedSession);
    }

    return updatedSession;
  }
}
