import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { LedgerService } from '../../domain/services/ledger.service.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';

export interface TransferFundsInput {
  gameSessionId: string;
  sourceAgentId: string;
  destinationAgentId: string;
  amount: string;
}

export class TransferFundsUseCase {
  constructor(
    private readonly repository: GameSessionRepositoryPort,
    private readonly ledgerService: LedgerService,
  ) {}

  async execute(input: TransferFundsInput) {
    const session = await this.repository.findById(input.gameSessionId);

    if (!session) {
      throw new DomainInvariantError('Game session not found.');
    }

    const sourceAgent = session.agents.find(
      (agent) => agent.id === input.sourceAgentId,
    );
    const destinationAgent = session.agents.find(
      (agent) => agent.id === input.destinationAgentId,
    );

    if (!sourceAgent || !destinationAgent) {
      throw new DomainInvariantError(
        'Both source and destination agents must exist in the game session.',
      );
    }

    if (sourceAgent.id === destinationAgent.id) {
      throw new DomainInvariantError(
        'Source and destination agents must be different.',
      );
    }

    const updatedBalances = this.ledgerService.transfer(
      sourceAgent.balance,
      destinationAgent.balance,
      Money.fromDecimal(input.amount),
    );

    const updatedSession = session.withAgents(
      session.agents.map((agent) => {
        if (agent.id === sourceAgent.id) {
          return agent.withAccounts(
            updatedBalances.source,
            agent.depositAccount,
          );
        }

        if (agent.id === destinationAgent.id) {
          return agent.withAccounts(
            updatedBalances.destination,
            agent.depositAccount,
          );
        }

        return agent;
      }),
    );

    await this.repository.save(updatedSession, [
      {
        type: 'transfer',
        gameSessionId: updatedSession.id,
        sourceAgentId: sourceAgent.id,
        destinationAgentId: destinationAgent.id,
        amount: input.amount,
      },
    ]);

    return updatedSession;
  }
}
