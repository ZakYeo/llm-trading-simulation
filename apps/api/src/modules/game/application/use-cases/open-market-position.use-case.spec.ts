import { describe, expect, it } from 'vitest';
import type { GameSessionSummary } from '@llm-sim/shared-types';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { MarketOpportunity } from '../../domain/entities/market-opportunity.js';
import type {
  GameSessionHistoryRecord,
  GameSessionRepositoryPort,
} from '../ports/game-session-repository.port.js';
import { OpenMarketPositionUseCase } from './open-market-position.use-case.js';

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
    return this.session?.id === id ? this.session : null;
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

function createSession() {
  return new GameSession({
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
        balance: AccountBalance.open(Money.fromDecimal('100.0000')),
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
  });
}

describe('OpenMarketPositionUseCase', () => {
  it('reserves trader capital and records an open market position', async () => {
    const repository = new InMemoryGameSessionRepository(createSession());
    const useCase = new OpenMarketPositionUseCase(repository);

    const session = await useCase.execute({
      gameSessionId: 'game-1',
      ownerAgentId: 'agent-2',
      opportunityId: 'opp-risky',
      amount: '5.0000',
    });

    expect(session.agents[1]?.balance.available.toDecimal()).toBe('94.9900');
    expect(session.agents[1]?.balance.reserved.toDecimal()).toBe('5.0000');
    expect(session.marketPositions).toHaveLength(1);
    expect(session.marketPositions[0]).toMatchObject({
      opportunityId: 'opp-risky',
      ownerAgentId: 'agent-2',
      entryRound: 0,
      settlementRound: 1,
      entryFeeBps: 20,
      entrySlippageBps: 24,
      effectiveResolutionReturnBps: 1176,
    });
    expect(session.marketPositions[0]?.entryFeeAmount.toDecimal()).toBe(
      '0.0100',
    );
    expect(repository.history).toContainEqual({
      type: 'market_position_opened',
      gameSessionId: 'game-1',
      roundNumber: 0,
      opportunityId: 'opp-risky',
      opportunityTitle: 'Binary Event Volatility',
      ownerAgentId: 'agent-2',
      amount: '5.0000',
      entryFeeBps: 20,
      entryFeeAmount: '0.0100',
      entrySlippageBps: 24,
      effectiveResolutionReturnBps: 1176,
    });
  });

  it('rejects non-trader agents and unknown opportunities', async () => {
    const repository = new InMemoryGameSessionRepository(createSession());
    const useCase = new OpenMarketPositionUseCase(repository);

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        ownerAgentId: 'agent-1',
        opportunityId: 'opp-risky',
        amount: '5.0000',
      }),
    ).rejects.toThrow('Only trader agents may open market positions.');

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        ownerAgentId: 'agent-2',
        opportunityId: 'missing',
        amount: '5.0000',
      }),
    ).rejects.toThrow('Market opportunity must exist in the game session.');
  });

  it('rejects commitments outside the opportunity limits', async () => {
    const repository = new InMemoryGameSessionRepository(createSession());
    const useCase = new OpenMarketPositionUseCase(repository);

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        ownerAgentId: 'agent-2',
        opportunityId: 'opp-risky',
        amount: '1.0000',
      }),
    ).rejects.toThrow(
      'Market position amount is below the opportunity minimum commitment.',
    );

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        ownerAgentId: 'agent-2',
        opportunityId: 'opp-risky',
        amount: '30.0000',
      }),
    ).rejects.toThrow(
      'Market position amount exceeds the opportunity maximum commitment.',
    );
  });

  it('rejects duplicate positions for the same opportunity', async () => {
    const repository = new InMemoryGameSessionRepository(createSession());
    const useCase = new OpenMarketPositionUseCase(repository);

    await useCase.execute({
      gameSessionId: 'game-1',
      ownerAgentId: 'agent-2',
      opportunityId: 'opp-risky',
      amount: '5.0000',
    });

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        ownerAgentId: 'agent-2',
        opportunityId: 'opp-risky',
        amount: '5.0000',
      }),
    ).rejects.toThrow(
      'Trader already has an open position for this market opportunity.',
    );
  });
});
