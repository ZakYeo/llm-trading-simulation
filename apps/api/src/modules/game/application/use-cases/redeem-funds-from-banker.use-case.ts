import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { LedgerService } from '../../domain/services/ledger.service.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';

export interface RedeemFundsFromBankerInput {
  gameSessionId: string;
  ownerAgentId: string;
  bankerAgentId: string;
  amount: string;
}

export class RedeemFundsFromBankerUseCase {
  constructor(
    private readonly repository: GameSessionRepositoryPort,
    private readonly ledgerService: LedgerService,
  ) {}

  async execute(input: RedeemFundsFromBankerInput) {
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
    const position = session.bankerCustodyPositions.find(
      (candidate) =>
        candidate.bankerAgentId === bankerAgent.id &&
        candidate.ownerAgentId === ownerAgent.id,
    );

    if (!position) {
      throw new DomainInvariantError(
        'Custody position not found for the owner and banker.',
      );
    }

    const updatedBalances = this.ledgerService.transfer(
      bankerAgent.balance,
      ownerAgent.balance,
      amount,
    );
    const updatedPosition = position.redeemFunds(amount);

    const updatedSession = session
      .withAgents(
        session.agents.map((agent) => {
          if (agent.id === bankerAgent.id) {
            return agent.withAccounts(
              updatedBalances.source,
              agent.depositAccount,
            );
          }

          if (agent.id === ownerAgent.id) {
            return agent.withAccounts(
              updatedBalances.destination,
              agent.depositAccount,
            );
          }

          return agent;
        }),
      )
      .withBankerCustodyPositions(
        session.bankerCustodyPositions.flatMap((candidate) =>
          candidate.bankerAgentId === bankerAgent.id &&
          candidate.ownerAgentId === ownerAgent.id
            ? updatedPosition.totalBalance().isZero()
              ? []
              : [updatedPosition]
            : [candidate],
        ),
      );

    await this.repository.save(updatedSession);

    return updatedSession;
  }
}
