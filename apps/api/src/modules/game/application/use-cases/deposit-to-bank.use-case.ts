import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { LedgerService } from '../../domain/services/ledger.service.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';

export interface DepositToBankInput {
  gameSessionId: string;
  agentId: string;
  amount: string;
}

export class DepositToBankUseCase {
  constructor(
    private readonly repository: GameSessionRepositoryPort,
    private readonly ledgerService: LedgerService,
  ) {}

  async execute(input: DepositToBankInput) {
    const session = await this.repository.findById(input.gameSessionId);

    if (!session) {
      throw new DomainInvariantError('Game session not found.');
    }

    const targetAgent = session.agents.find(
      (agent) => agent.id === input.agentId,
    );

    if (!targetAgent) {
      throw new DomainInvariantError('Agent not found in game session.');
    }

    const updatedAccounts = this.ledgerService.deposit(
      targetAgent.balance,
      targetAgent.depositAccount,
      Money.fromDecimal(input.amount),
    );

    const updatedSession = session.withAgents(
      session.agents.map((agent) =>
        agent.id === targetAgent.id
          ? agent.withAccounts(
              updatedAccounts.balance,
              updatedAccounts.depositAccount,
            )
          : agent,
      ),
    );

    await this.repository.save(updatedSession);

    return updatedSession;
  }
}
