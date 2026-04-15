import { describe, expect, it } from 'vitest';

import { BankerCustodyPosition } from '../../domain/entities/banker-custody-position.js';
import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { MarketOpportunity } from '../../domain/entities/market-opportunity.js';
import { MarketPosition } from '../../domain/entities/market-position.js';
import {
  GameSessionPrismaMapper,
  type PersistedGameSessionRecord,
} from './game-session-prisma.mapper.js';

describe('GameSessionPrismaMapper', () => {
  it('maps a domain session into nested persistence create input', () => {
    const session = new GameSession({
      id: 'game-1',
      name: 'Treasury Table',
      status: 'setup',
      currentRound: 0,
      agents: [
        new GameAgent({
          id: 'agent-1',
          name: 'Banker Bot',
          role: 'banker',
          balance: AccountBalance.open(Money.fromDecimal('100.0000')).reserve(
            Money.fromDecimal('25.0000'),
          ),
          depositAccount: DepositAccount.open().deposit(
            Money.fromDecimal('10.0000'),
          ),
          personalityProfile: {
            kind: 'banker',
            warmth: 8,
            salesAggression: 6,
            riskDiscipline: 9,
          },
        }),
      ],
      bankerCustodyPositions: [
        new BankerCustodyPosition({
          bankerAgentId: 'agent-1',
          ownerAgentId: 'agent-1',
          principal: Money.fromDecimal('10.0000'),
          accruedInterest: Money.fromDecimal('1.5000'),
        }),
      ],
      marketOpportunities: [
        new MarketOpportunity({
          id: 'opp-1',
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
          opportunityId: 'opp-1',
          ownerAgentId: 'agent-1',
          opportunityTitle: 'Binary Event Volatility',
          principal: Money.fromDecimal('12.0000'),
          entryRound: 0,
          settlementRound: 1,
        }),
      ],
    });

    expect(GameSessionPrismaMapper.toCreateInput(session)).toEqual({
      id: 'game-1',
      name: 'Treasury Table',
      status: 'SETUP',
      currentRound: 0,
      agents: {
        create: [
          {
            id: 'agent-1',
            name: 'Banker Bot',
            role: 'BANKER',
            personalityProfile: {
              kind: 'banker',
              warmth: 8,
              salesAggression: 6,
              riskDiscipline: 9,
            },
            balance: {
              create: {
                available: '75.0000',
                reserved: '25.0000',
              },
            },
            depositAccount: {
              create: {
                principal: '10.0000',
                accrued: '0.0000',
              },
            },
          },
        ],
      },
      bankerCustodyPositions: {
        create: [
          {
            bankerAgentId: 'agent-1',
            ownerAgentId: 'agent-1',
            principal: '10.0000',
            accrued: '1.5000',
          },
        ],
      },
      marketOpportunities: {
        create: [
          {
            id: 'opp-1',
            templateId: 'event-binary-01',
            category: 'EVENT',
            title: 'Binary Event Volatility',
            summary: 'High variance one-round event trade.',
            riskLevel: 'HIGH',
            listedRound: 0,
            settlementRound: 1,
            minCommitment: '5.0000',
            maxCommitment: '25.0000',
            estimatedNetReturnBps: 300,
            worstCaseReturnBps: -800,
            bestCaseReturnBps: 1200,
            resolutionReturnBps: 1200,
          },
        ],
      },
      marketPositions: {
        create: [
          {
            opportunityId: 'opp-1',
            ownerAgentId: 'agent-1',
            opportunityTitle: 'Binary Event Volatility',
            principal: '12.0000',
            entryRound: 0,
            settlementRound: 1,
          },
        ],
      },
    });
  });

  it('maps a persisted record back into a domain session', () => {
    const record: PersistedGameSessionRecord = {
      id: 'game-1',
      name: 'Treasury Table',
      status: 'ACTIVE',
      currentRound: 2,
      agents: [
        {
          id: 'agent-1',
          name: 'Trader Bot',
          role: 'TRADER',
          personalityProfile: {
            kind: 'trader',
            assertiveness: 7,
            riskAppetite: 8,
            convictionThreshold: 3,
          },
          balance: {
            available: '80.0000',
            reserved: '20.0000',
          },
          depositAccount: {
            principal: '5.0000',
            accrued: '1.0000',
          },
        },
      ],
      bankerCustodyPositions: [
        {
          bankerAgentId: 'agent-1',
          ownerAgentId: 'agent-1',
          principal: '7.0000',
          accrued: '0.5000',
        },
      ],
      marketOpportunities: [
        {
          id: 'opp-1',
          templateId: 'carry-trap-01',
          category: 'CARRY',
          title: 'Crowded Carry Trap',
          summary: 'Weak expected value and hidden drag.',
          riskLevel: 'LOW',
          listedRound: 2,
          settlementRound: 3,
          minCommitment: '5.0000',
          maxCommitment: '20.0000',
          estimatedNetReturnBps: -75,
          worstCaseReturnBps: -150,
          bestCaseReturnBps: 25,
          resolutionReturnBps: -100,
        },
      ],
      marketPositions: [
        {
          opportunityId: 'opp-1',
          ownerAgentId: 'agent-1',
          opportunityTitle: 'Crowded Carry Trap',
          principal: '9.0000',
          entryRound: 2,
          settlementRound: 3,
        },
      ],
    };

    const session = GameSessionPrismaMapper.toDomain(record);

    expect(session.status).toBe('active');
    expect(session.currentRound).toBe(2);
    expect(session.agents[0]?.role).toBe('trader');
    expect(session.agents[0]?.personalityProfile).toEqual({
      kind: 'trader',
      assertiveness: 7,
      riskAppetite: 8,
      convictionThreshold: 3,
    });
    expect(session.agents[0]?.balance.available.toDecimal()).toBe('80.0000');
    expect(session.agents[0]?.balance.reserved.toDecimal()).toBe('20.0000');
    expect(session.agents[0]?.depositAccount.principal.toDecimal()).toBe(
      '5.0000',
    );
    expect(session.agents[0]?.depositAccount.accruedInterest.toDecimal()).toBe(
      '1.0000',
    );
    expect(session.bankerCustodyPositions[0]?.bankerAgentId).toBe('agent-1');
    expect(session.bankerCustodyPositions[0]?.ownerAgentId).toBe('agent-1');
    expect(session.bankerCustodyPositions[0]?.principal.toDecimal()).toBe(
      '7.0000',
    );
    expect(session.bankerCustodyPositions[0]?.accruedInterest.toDecimal()).toBe(
      '0.5000',
    );
    expect(session.marketOpportunities[0]?.riskLevel).toBe('low');
    expect(session.marketPositions[0]?.principal.toDecimal()).toBe('9.0000');
  });
});
