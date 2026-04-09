import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { LedgerService } from '../../domain/services/ledger.service.js';
import { BankerCustodyPosition } from '../../domain/entities/banker-custody-position.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';

export interface PlaceFundsWithBankerInput {
  gameSessionId: string;
  ownerAgentId: string;
  bankerAgentId: string;
  amount: string;
}

export class PlaceFundsWithBankerUseCase {
  constructor(
    private readonly repository: GameSessionRepositoryPort,
    private readonly ledgerService: LedgerService,
  ) {}

  async execute(input: PlaceFundsWithBankerInput) {
    const session = await this.repository.findById(input.gameSessionId);

    if (!session) {
      throw new DomainInvariantError('Game session not found.');
    }

    const ownerAgent = session.agents.find(
      (agent) => agent.id === input.ownerAgentId,
    );
    const bankerAgent = session.agents.find(
      (agent) => agent.id === input.bankerAgentId,
    );

    if (!ownerAgent || !bankerAgent) {
      throw new DomainInvariantError(
        'Both owner and banker agents must exist in the game session.',
      );
    }

    if (ownerAgent.id === bankerAgent.id) {
      throw new DomainInvariantError(
        'Owner and banker agents must be different.',
      );
    }

    if (bankerAgent.role !== 'banker') {
      throw new DomainInvariantError('Target agent must have the banker role.');
    }

    const amount = Money.fromDecimal(input.amount);
    const updatedBalances = this.ledgerService.transfer(
      ownerAgent.balance,
      bankerAgent.balance,
      amount,
    );

    const existingPosition = session.bankerCustodyPositions.find(
      (position) =>
        position.bankerAgentId === bankerAgent.id &&
        position.ownerAgentId === ownerAgent.id,
    );
    const updatedPosition = (
      existingPosition ??
      new BankerCustodyPosition({
        bankerAgentId: bankerAgent.id,
        ownerAgentId: ownerAgent.id,
        principal: Money.zero(),
        accruedInterest: Money.zero(),
      })
    ).placeFunds(amount);

    const updatedSession = session
      .withAgents(
        session.agents.map((agent) => {
          if (agent.id === ownerAgent.id) {
            return agent.withAccounts(
              updatedBalances.source,
              agent.depositAccount,
            );
          }

          if (agent.id === bankerAgent.id) {
            return agent.withAccounts(
              updatedBalances.destination,
              agent.depositAccount,
            );
          }

          return agent;
        }),
      )
      .withBankerCustodyPositions(
        session.bankerCustodyPositions.some(
          (position) =>
            position.bankerAgentId === bankerAgent.id &&
            position.ownerAgentId === ownerAgent.id,
        )
          ? session.bankerCustodyPositions.map((position) =>
              position.bankerAgentId === bankerAgent.id &&
              position.ownerAgentId === ownerAgent.id
                ? updatedPosition
                : position,
            )
          : [...session.bankerCustodyPositions, updatedPosition],
      );

    await this.repository.saveWithCustodyPlacement(updatedSession, {
      gameSessionId: updatedSession.id,
      roundNumber: updatedSession.currentRound,
      bankerAgentId: bankerAgent.id,
      ownerAgentId: ownerAgent.id,
      amount: input.amount,
    });

    return updatedSession;
  }
}
