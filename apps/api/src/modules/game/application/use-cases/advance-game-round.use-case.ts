import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { LedgerService } from '../../domain/services/ledger.service.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';

export interface AdvanceGameRoundInput {
  gameSessionId: string;
  interestRateBps: number;
}

export class AdvanceGameRoundUseCase {
  constructor(
    private readonly repository: GameSessionRepositoryPort,
    private readonly ledgerService: LedgerService,
  ) {}

  async execute(input: AdvanceGameRoundInput) {
    const session = await this.repository.findById(input.gameSessionId);

    if (!session) {
      throw new DomainInvariantError('Game session not found.');
    }

    if (input.interestRateBps < 0) {
      throw new DomainInvariantError('Interest rate cannot be negative.');
    }

    const updatedSession = session
      .withAgents(
        session.agents.map((agent) =>
          agent.withAccounts(
            agent.balance,
            agent.role === 'banker'
              ? this.ledgerService.accrueInterest(
                  agent.depositAccount,
                  input.interestRateBps,
                )
              : agent.depositAccount,
          ),
        ),
      )
      .advanceRound();

    await this.repository.save(updatedSession);

    return updatedSession;
  }
}
