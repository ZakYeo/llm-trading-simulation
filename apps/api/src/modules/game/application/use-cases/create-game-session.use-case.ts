import type { AgentRole } from '@llm-sim/shared-types';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { IdGeneratorPort } from '../../../shared/application/ports/id-generator.port.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import type { MarketOpportunity } from '../../domain/entities/market-opportunity.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';
import { MarketOpportunityBoardFactory } from '../services/market-opportunity-board.factory.js';

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
    private readonly marketOpportunityBoardFactory = new MarketOpportunityBoardFactory(),
  ) {}

  async execute(input: CreateGameSessionInput): Promise<GameSession> {
    const initialBalance = Money.fromDecimal(input.initialBalance);

    if (!initialBalance.greaterThan(Money.zero())) {
      throw new DomainInvariantError(
        'Initial balance must be greater than zero.',
      );
    }

    if (input.agents.length === 0) {
      throw new DomainInvariantError(
        'Game sessions must contain at least one agent.',
      );
    }

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

    const sessionId = this.idGenerator.next();

    const marketOpportunities =
      this.marketOpportunityBoardFactory.createInitialBoard(sessionId, 1);

    const session = new GameSession({
      id: sessionId,
      name: input.name,
      status: 'setup',
      currentRound: 1,
      agents,
      marketOpportunities,
    });

    await this.repository.save(
      session,
      marketOpportunities.map((opportunity) =>
        CreateGameSessionUseCase.toMarketOpportunityListedHistory(
          session.id,
          session.currentRound,
          opportunity,
        ),
      ),
    );

    return session;
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
}
