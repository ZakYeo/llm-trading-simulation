import { describe, expect, it } from 'vitest';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { PrismaGameSessionRepository } from './prisma-game-session.repository.js';

describe('PrismaGameSessionRepository', () => {
  it('creates a session when it does not already exist', async () => {
    let receivedArgs: unknown;

    const repository = new PrismaGameSessionRepository({
      gameSession: {
        async create(args) {
          receivedArgs = args;
        },
        async findUnique() {
          return null;
        },
        async delete() {},
      },
    });

    await repository.save(
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

    expect(receivedArgs).toEqual({
      data: {
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
                  available: '100.0000',
                  reserved: '0.0000',
                },
              },
              depositAccount: {
                create: {
                  principal: '0.0000',
                  accrued: '0.0000',
                },
              },
            },
          ],
        },
      },
    });
  });

  it('updates a session when it already exists', async () => {
    const receivedArgs: unknown[] = [];

    const repository = new PrismaGameSessionRepository({
      gameSession: {
        async create(args) {
          receivedArgs.push(args);
        },
        async delete(args) {
          receivedArgs.push(args);
        },
        async findUnique() {
          return { id: 'game-1' } as never;
        },
      },
    });

    await repository.save(
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

    expect(receivedArgs).toEqual([
      {
        where: { id: 'game-1' },
      },
      {
        data: {
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
                    available: '100.0000',
                    reserved: '0.0000',
                  },
                },
                depositAccount: {
                  create: {
                    principal: '0.0000',
                    accrued: '0.0000',
                  },
                },
              },
            ],
          },
        },
      },
    ]);
  });

  it('hydrates a session from prisma records', async () => {
    const repository = new PrismaGameSessionRepository({
      gameSession: {
        async create() {},
        async delete() {},
        async findUnique() {
          return {
            id: 'game-1',
            name: 'Treasury Table',
            status: 'SETUP',
            currentRound: 0,
            agents: [
              {
                id: 'agent-1',
                name: 'Analyst Bot',
                role: 'ANALYST',
                balance: {
                  available: '100.0000',
                  reserved: '0.0000',
                },
                depositAccount: {
                  principal: '0.0000',
                  accrued: '0.0000',
                },
              },
            ],
          };
        },
      },
    });

    const session = await repository.findById('game-1');

    expect(session?.id).toBe('game-1');
    expect(session?.agents[0]?.role).toBe('analyst');
    expect(session?.agents[0]?.balance.available.toDecimal()).toBe('100.0000');
  });
});
