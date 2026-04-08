import type { AgentRole } from '@llm-sim/shared-types';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';
import type { IdGeneratorPort } from '../../../shared/application/ports/id-generator.port.js';
import { Money } from '../../../shared/domain/value-objects/money.js';

export interface CreateGameSessionAgentInput {
  name: string;
  role: AgentRole;
}

export interface CreateGameSessionInput {
  name: string;
  initialBalance: string;
  agents: CreateGameSessionAgentInput[];
}

export class CreateGameSessionUseCase {
  constructor(
    private readonly repository: GameSessionRepositoryPort,
    private readonly idGenerator: IdGeneratorPort,
  ) {}

  async execute(input: CreateGameSessionInput): Promise<GameSession> {
    const initialBalance = Money.fromDecimal(input.initialBalance);
    const agents = input.agents.map(
      (agent) =>
        new GameAgent({
          id: this.idGenerator.next(),
          name: agent.name,
          role: agent.role,
          balance: AccountBalance.open(initialBalance),
          depositAccount: DepositAccount.open(),
        }),
    );

    const session = new GameSession({
      id: this.idGenerator.next(),
      name: input.name,
      status: 'setup',
      currentRound: 0,
      agents,
    });

    await this.repository.save(session);

    return session;
  }
}
