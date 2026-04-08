import { describe, expect, it } from 'vitest';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
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
    };

    const session = GameSessionPrismaMapper.toDomain(record);

    expect(session.status).toBe('active');
    expect(session.currentRound).toBe(2);
    expect(session.agents[0]?.role).toBe('trader');
    expect(session.agents[0]?.balance.available.toDecimal()).toBe('80.0000');
    expect(session.agents[0]?.balance.reserved.toDecimal()).toBe('20.0000');
    expect(session.agents[0]?.depositAccount.principal.toDecimal()).toBe(
      '5.0000',
    );
    expect(session.agents[0]?.depositAccount.accruedInterest.toDecimal()).toBe(
      '1.0000',
    );
  });
});
