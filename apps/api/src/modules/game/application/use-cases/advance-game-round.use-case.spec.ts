import { describe, expect, it } from 'vitest';
import type { GameSessionSummary } from '@llm-sim/shared-types';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { BankerCustodyPosition } from '../../domain/entities/banker-custody-position.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { MarketOpportunity } from '../../domain/entities/market-opportunity.js';
import { MarketPosition } from '../../domain/entities/market-position.js';
import type {
  GameSessionHistoryRecord,
  GameSessionRepositoryPort,
} from '../ports/game-session-repository.port.js';
import { AdvanceGameRoundUseCase } from './advance-game-round.use-case.js';

class InMemoryGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private session: GameSession | null) {}

  saved: GameSession[] = [];
  history: GameSessionHistoryRecord[] = [];

  async save(
    session: GameSession,
    history: GameSessionHistoryRecord[] = [],
  ): Promise<void> {
    this.saved.push(session);
    this.history.push(...history);
    this.session = session;
  }

  async findById(id: string): Promise<GameSession | null> {
    if (this.session?.id === id) {
      return this.session;
    }

    return null;
  }

  async list(): Promise<GameSessionSummary[]> {
    return this.session
      ? [
          {
            id: this.session.id,
            name: this.session.name,
            status: this.session.status,
            currentRound: this.session.currentRound,
          },
        ]
      : [];
  }
}

describe('AdvanceGameRoundUseCase', () => {
  it('advances the round and accrues interest only for banker custody positions', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('80.0000')),
            depositAccount: DepositAccount.restore(
              Money.fromDecimal('20.0000'),
            ),
          }),
          new GameAgent({
            id: 'agent-2',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('75.0000')),
            depositAccount: DepositAccount.restore(
              Money.fromDecimal('25.0000'),
            ),
          }),
        ],
        bankerCustodyPositions: [
          new BankerCustodyPosition({
            bankerAgentId: 'agent-1',
            ownerAgentId: 'agent-2',
            principal: Money.fromDecimal('30.0000'),
            accruedInterest: Money.zero(),
          }),
        ],
      }),
    );

    const useCase = new AdvanceGameRoundUseCase(repository);
    const session = await useCase.execute({
      gameSessionId: 'game-1',
      interestRateBps: 250,
    });

    expect(session.status).toBe('active');
    expect(session.currentRound).toBe(1);
    expect(session.agents[0]?.balance.available.toDecimal()).toBe('80.7500');
    expect(session.agents[0]?.depositAccount.principal.toDecimal()).toBe(
      '20.0000',
    );
    expect(session.agents[0]?.depositAccount.accruedInterest.toDecimal()).toBe(
      '0.0000',
    );
    expect(session.agents[1]?.depositAccount.principal.toDecimal()).toBe(
      '25.0000',
    );
    expect(session.agents[1]?.depositAccount.accruedInterest.toDecimal()).toBe(
      '0.0000',
    );
    expect(session.bankerCustodyPositions[0]?.principal.toDecimal()).toBe(
      '30.0000',
    );
    expect(session.bankerCustodyPositions[0]?.accruedInterest.toDecimal()).toBe(
      '0.7500',
    );
    expect(session.marketOpportunities.length).toBeGreaterThanOrEqual(2);
    expect(session.marketOpportunities.length).toBeLessThanOrEqual(4);
    expect(
      session.marketOpportunities.every(
        (opportunity) => opportunity.listedRound === 1,
      ),
    ).toBe(true);
    expect(repository.saved).toHaveLength(1);
  });

  it('settles one-round market positions and rotates the opportunity board', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Market Table',
        status: 'active',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('100.0000')),
            depositAccount: DepositAccount.open(),
          }),
          new GameAgent({
            id: 'agent-2',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.restore(
              Money.fromDecimal('94.9900'),
              Money.fromDecimal('5.0000'),
            ),
            depositAccount: DepositAccount.open(),
          }),
        ],
        marketOpportunities: [
          new MarketOpportunity({
            id: 'opp-risky',
            templateId: 'event-binary-01',
            category: 'event',
            title: 'Binary Event Volatility',
            summary: 'High variance one-round event trade.',
            riskLevel: 'high',
            listedRound: 0,
            settlementRound: 1,
            minCommitment: '5.0000',
            maxCommitment: '25.0000',
            estimatedNetReturnBps: 300,
            worstCaseReturnBps: -800,
            bestCaseReturnBps: 1200,
            resolutionReturnBps: 1200,
          }),
        ],
        marketPositions: [
          new MarketPosition({
            opportunityId: 'opp-risky',
            ownerAgentId: 'agent-2',
            opportunityTitle: 'Binary Event Volatility',
            principal: Money.fromDecimal('5.0000'),
            entryRound: 0,
            settlementRound: 1,
            entryFeeBps: 20,
            entryFeeAmount: Money.fromDecimal('0.0100'),
            entrySlippageBps: 24,
            effectiveResolutionReturnBps: 1176,
          }),
        ],
      }),
    );

    const useCase = new AdvanceGameRoundUseCase(repository);
    const session = await useCase.execute({
      gameSessionId: 'game-1',
      interestRateBps: 0,
    });

    expect(session.currentRound).toBe(1);
    expect(session.agents[1]?.balance.available.toDecimal()).toBe('100.5780');
    expect(session.agents[1]?.balance.reserved.toDecimal()).toBe('0.0000');
    expect(session.marketPositions).toEqual([]);
    expect(session.marketOpportunities.length).toBeGreaterThanOrEqual(2);
    expect(session.marketOpportunities.length).toBeLessThanOrEqual(4);
    expect(
      session.marketOpportunities.every((opportunity) =>
        opportunity.id.includes('-r1-'),
      ),
    ).toBe(true);
    expect(repository.history).toContainEqual({
      type: 'market_position_settled',
      gameSessionId: 'game-1',
      roundNumber: 1,
      opportunityId: 'opp-risky',
      opportunityTitle: 'Binary Event Volatility',
      ownerAgentId: 'agent-2',
      principal: '5.0000',
      profitOrLoss: '0.5880',
    });
    expect(repository.history).toContainEqual({
      type: 'market_opportunity_resolved',
      gameSessionId: 'game-1',
      roundNumber: 1,
      opportunityId: 'opp-risky',
      opportunityTitle: 'Binary Event Volatility',
      opportunityCategory: 'event',
      opportunitySummary: 'High variance one-round event trade.',
      opportunityRiskLevel: 'high',
      listedRound: 0,
      settlementRound: 1,
      minCommitment: '5.0000',
      maxCommitment: '25.0000',
      estimatedNetReturnBps: 300,
      worstCaseReturnBps: -800,
      bestCaseReturnBps: 1200,
      participantCount: 1,
      totalPrincipal: '5.0000',
      totalProfitOrLoss: '0.5880',
    });
    expect(
      repository.history.some(
        (record) => record.type === 'market_opportunity_listed',
      ),
    ).toBe(true);
  });

  it('records an opportunity resolution even when no trader bought it', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Market Table',
        status: 'active',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('100.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
        marketOpportunities: [
          new MarketOpportunity({
            id: 'opp-idle',
            templateId: 'carry-stable-01',
            category: 'carry',
            title: 'Carry Ladder',
            summary: 'Stable carry opportunity.',
            riskLevel: 'low',
            listedRound: 0,
            settlementRound: 1,
            minCommitment: '5.0000',
            maxCommitment: '25.0000',
            estimatedNetReturnBps: 60,
            worstCaseReturnBps: -20,
            bestCaseReturnBps: 120,
            resolutionReturnBps: 60,
          }),
        ],
      }),
    );

    const useCase = new AdvanceGameRoundUseCase(repository);
    await useCase.execute({
      gameSessionId: 'game-1',
      interestRateBps: 0,
    });

    expect(repository.history).toContainEqual({
      type: 'market_opportunity_resolved',
      gameSessionId: 'game-1',
      roundNumber: 1,
      opportunityId: 'opp-idle',
      opportunityTitle: 'Carry Ladder',
      opportunityCategory: 'carry',
      opportunitySummary: 'Stable carry opportunity.',
      opportunityRiskLevel: 'low',
      listedRound: 0,
      settlementRound: 1,
      minCommitment: '5.0000',
      maxCommitment: '25.0000',
      estimatedNetReturnBps: 60,
      worstCaseReturnBps: -20,
      bestCaseReturnBps: 120,
      participantCount: 0,
      totalPrincipal: '0.0000',
      totalProfitOrLoss: '0.0000',
    });
  });

  it('uses the configured default interest rate when the request omits one', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('80.0000')),
            depositAccount: DepositAccount.open(),
          }),
          new GameAgent({
            id: 'agent-2',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('75.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
        bankerCustodyPositions: [
          new BankerCustodyPosition({
            bankerAgentId: 'agent-1',
            ownerAgentId: 'agent-2',
            principal: Money.fromDecimal('30.0000'),
            accruedInterest: Money.zero(),
          }),
        ],
      }),
    );

    const useCase = new AdvanceGameRoundUseCase(repository, 300);
    const session = await useCase.execute({
      gameSessionId: 'game-1',
    });

    expect(session.currentRound).toBe(1);
    expect(session.agents[0]?.balance.available.toDecimal()).toBe('80.9000');
    expect(session.bankerCustodyPositions[0]?.accruedInterest.toDecimal()).toBe(
      '0.9000',
    );
  });

  it('fails when the target game session does not exist', async () => {
    const repository = new InMemoryGameSessionRepository(null);
    const useCase = new AdvanceGameRoundUseCase(repository);

    await expect(
      useCase.execute({
        gameSessionId: 'missing',
        interestRateBps: 250,
      }),
    ).rejects.toThrow(DomainInvariantError);
  });

  it('fails when attempting to advance a non-runnable session state', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'completed',
        currentRound: 3,
        agents: [
          new GameAgent({
            id: 'agent-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('100.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
      }),
    );
    const useCase = new AdvanceGameRoundUseCase(repository);

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        interestRateBps: 250,
      }),
    ).rejects.toThrow(DomainInvariantError);
  });

  it('fails when the configured default interest rate is negative', async () => {
    const repository = new InMemoryGameSessionRepository(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('100.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
      }),
    );
    const useCase = new AdvanceGameRoundUseCase(repository, -1);

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
      }),
    ).rejects.toThrow('Default interest rate cannot be negative.');
  });
});
