import { describe, expect, it } from 'vitest';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { BankerCustodyPosition } from '../../domain/entities/banker-custody-position.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { PrismaGameSessionRepository } from './prisma-game-session.repository.js';

function createMarketPersistenceDelegates() {
  return {
    marketOpportunity: {
      async findMany() {
        return [];
      },
      async deleteMany() {},
      async upsert() {},
    },
    marketPosition: {
      async findMany() {
        return [];
      },
      async deleteMany() {},
      async upsert() {},
    },
    marketPositionOpened: {
      async create() {},
    },
    marketPositionSettled: {
      async create() {},
    },
  };
}

describe('PrismaGameSessionRepository', () => {
  it('creates a session when it does not already exist', async () => {
    const receivedArgs: unknown[] = [];

    const repository = new PrismaGameSessionRepository({
      async $transaction(callback) {
        return callback(this as unknown as never);
      },
      agent: {
        async create() {},
        async deleteMany() {},
        async upsert() {},
      },
      gameSession: {
        async create(args) {
          receivedArgs.push(args);
        },
        async findUnique() {
          return null;
        },
        async update() {},
      },
      gameRound: {
        async createMany(args) {
          receivedArgs.push(args);
        },
      },
      bankerCustodyPosition: {
        async findMany(args) {
          receivedArgs.push(args);
          return [];
        },
        async upsert(args) {
          receivedArgs.push(args);
        },
        async deleteMany(args) {
          receivedArgs.push(args);
        },
      },
      transfer: {
        async create() {},
      },
      custodyPlacement: {
        async create() {},
      },
      custodyRedemption: {
        async create() {},
      },
      custodyAccrual: {
        async createMany() {},
      },
      ...createMarketPersistenceDelegates(),
      deposit: {
        async create() {},
      },
      withdrawal: {
        async create() {},
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
          bankerCustodyPositions: {
            create: [],
          },
          marketOpportunities: {
            create: [],
          },
          marketPositions: {
            create: [],
          },
        },
      },
    ]);
  });

  it('updates a session while preserving the session row and rewriting agents', async () => {
    const receivedArgs: unknown[] = [];

    const repository = new PrismaGameSessionRepository({
      async $transaction(callback) {
        return callback(this as unknown as never);
      },
      agent: {
        async create() {},
        async upsert(args) {
          receivedArgs.push(args);
        },
        async deleteMany(args) {
          receivedArgs.push(args);
        },
      },
      gameSession: {
        async findUnique() {
          return { id: 'game-1', currentRound: 0 } as never;
        },
        async create() {},
        async update(args) {
          receivedArgs.push(args);
        },
      },
      gameRound: {
        async createMany(args) {
          receivedArgs.push(args);
        },
      },
      bankerCustodyPosition: {
        async findMany(args) {
          receivedArgs.push(args);
          return [];
        },
        async upsert(args) {
          receivedArgs.push(args);
        },
        async deleteMany(args) {
          receivedArgs.push(args);
        },
      },
      transfer: {
        async create() {},
      },
      custodyPlacement: {
        async create() {},
      },
      custodyRedemption: {
        async create() {},
      },
      custodyAccrual: {
        async createMany() {},
      },
      ...createMarketPersistenceDelegates(),
      deposit: {
        async create() {},
      },
      withdrawal: {
        async create() {},
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

    expect(receivedArgs[0]).toEqual({
      where: { id: 'game-1' },
      data: {
        name: 'Treasury Table',
        status: 'SETUP',
        currentRound: 0,
      },
    });
    expect(receivedArgs[1]).toMatchObject({
      where: {
        gameSessionId: 'game-1',
        id: {
          notIn: ['agent-1'],
        },
      },
    });
    expect(receivedArgs[2]).toEqual({
      where: { id: 'agent-1' },
      create: {
        id: 'agent-1',
        gameSessionId: 'game-1',
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
      update: {
        name: 'Banker Bot',
        role: 'BANKER',
        balance: {
          upsert: {
            create: {
              available: '100.0000',
              reserved: '0.0000',
            },
            update: {
              available: '100.0000',
              reserved: '0.0000',
            },
          },
        },
        depositAccount: {
          upsert: {
            create: {
              principal: '0.0000',
              accrued: '0.0000',
            },
            update: {
              principal: '0.0000',
              accrued: '0.0000',
            },
          },
        },
      },
    });
    expect(receivedArgs[3]).toEqual({
      where: {
        gameSessionId: 'game-1',
      },
      select: {
        bankerAgentId: true,
        ownerAgentId: true,
      },
    });
  });

  it('creates durable round records when currentRound advances', async () => {
    const receivedArgs: unknown[] = [];

    const repository = new PrismaGameSessionRepository({
      async $transaction(callback) {
        return callback(this as unknown as never);
      },
      agent: {
        async create() {},
        async upsert(args) {
          receivedArgs.push(args);
        },
        async deleteMany(args) {
          receivedArgs.push(args);
        },
      },
      gameSession: {
        async findUnique() {
          return { id: 'game-1', currentRound: 1 } as never;
        },
        async create() {},
        async update(args) {
          receivedArgs.push(args);
        },
      },
      gameRound: {
        async createMany(args) {
          receivedArgs.push(args);
        },
      },
      bankerCustodyPosition: {
        async findMany() {
          return [];
        },
        async upsert(args) {
          receivedArgs.push(args);
        },
        async deleteMany(args) {
          receivedArgs.push(args);
        },
      },
      transfer: {
        async create() {},
      },
      custodyPlacement: {
        async create() {},
      },
      custodyRedemption: {
        async create() {},
      },
      custodyAccrual: {
        async createMany() {},
      },
      ...createMarketPersistenceDelegates(),
      deposit: {
        async create() {},
      },
      withdrawal: {
        async create() {},
      },
    });

    await repository.save(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
        status: 'active',
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

    expect(receivedArgs).toContainEqual({
      data: [
        {
          gameSessionId: 'game-1',
          roundNumber: 2,
        },
        {
          gameSessionId: 'game-1',
          roundNumber: 3,
        },
      ],
    });
  });

  it('updates custody positions with keyed upserts and deletes only removed rows', async () => {
    const receivedArgs: unknown[] = [];

    const repository = new PrismaGameSessionRepository({
      async $transaction(callback) {
        return callback(this as unknown as never);
      },
      agent: {
        async create() {},
        async upsert(args) {
          receivedArgs.push(args);
        },
        async deleteMany(args) {
          receivedArgs.push(args);
        },
      },
      gameSession: {
        async findUnique() {
          return { id: 'game-1', currentRound: 0 } as never;
        },
        async create() {},
        async update(args) {
          receivedArgs.push(args);
        },
      },
      gameRound: {
        async createMany(args) {
          receivedArgs.push(args);
        },
      },
      bankerCustodyPosition: {
        async findMany() {
          return [
            { bankerAgentId: 'agent-1', ownerAgentId: 'agent-2' },
            { bankerAgentId: 'agent-1', ownerAgentId: 'agent-3' },
          ];
        },
        async upsert(args) {
          receivedArgs.push(args);
        },
        async deleteMany(args) {
          receivedArgs.push(args);
        },
      },
      transfer: {
        async create() {},
      },
      custodyPlacement: {
        async create() {},
      },
      custodyRedemption: {
        async create() {},
      },
      custodyAccrual: {
        async createMany() {},
      },
      ...createMarketPersistenceDelegates(),
      deposit: {
        async create() {},
      },
      withdrawal: {
        async create() {},
      },
    });

    await repository.save(
      new GameSession({
        id: 'game-1',
        name: 'Treasury Table',
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
        bankerCustodyPositions: [
          new BankerCustodyPosition({
            bankerAgentId: 'agent-1',
            ownerAgentId: 'agent-2',
            principal: Money.fromDecimal('25.0000'),
            accruedInterest: Money.fromDecimal('0.6250'),
          }),
        ],
      }),
    );

    expect(receivedArgs).toContainEqual({
      where: {
        gameSessionId: 'game-1',
        OR: [{ bankerAgentId: 'agent-1', ownerAgentId: 'agent-3' }],
      },
    });
    expect(receivedArgs).toContainEqual({
      where: {
        gameSessionId_bankerAgentId_ownerAgentId: {
          gameSessionId: 'game-1',
          bankerAgentId: 'agent-1',
          ownerAgentId: 'agent-2',
        },
      },
      create: {
        gameSessionId: 'game-1',
        bankerAgentId: 'agent-1',
        ownerAgentId: 'agent-2',
        principal: '25.0000',
        accrued: '0.6250',
      },
      update: {
        principal: '25.0000',
        accrued: '0.6250',
      },
    });
  });

  it('hydrates a session from prisma records', async () => {
    const repository = new PrismaGameSessionRepository({
      async $transaction(callback) {
        return callback(this as unknown as never);
      },
      agent: {
        async create() {},
        async deleteMany() {},
        async upsert() {},
      },
      gameSession: {
        async create() {},
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
        async update() {},
      },
      gameRound: {
        async createMany() {},
      },
      bankerCustodyPosition: {
        async findMany() {
          return [];
        },
        async upsert() {},
        async deleteMany() {},
      },
      transfer: {
        async create() {},
      },
      custodyPlacement: {
        async create() {},
      },
      custodyRedemption: {
        async create() {},
      },
      custodyAccrual: {
        async createMany() {},
      },
      ...createMarketPersistenceDelegates(),
      deposit: {
        async create() {},
      },
      withdrawal: {
        async create() {},
      },
    });

    const session = await repository.findById('game-1');

    expect(session?.id).toBe('game-1');
    expect(session?.agents[0]?.role).toBe('analyst');
    expect(session?.agents[0]?.balance.available.toDecimal()).toBe('100.0000');
  });

  it('persists a transfer event alongside a session update', async () => {
    const receivedArgs: unknown[] = [];

    const repository = new PrismaGameSessionRepository({
      async $transaction(callback) {
        return callback(this as unknown as never);
      },
      agent: {
        async create() {},
        async upsert(args) {
          receivedArgs.push(args);
        },
        async deleteMany(args) {
          receivedArgs.push(args);
        },
      },
      gameSession: {
        async findUnique() {
          return { id: 'game-1', currentRound: 0 } as never;
        },
        async create() {},
        async update(args) {
          receivedArgs.push(args);
        },
      },
      gameRound: {
        async createMany() {},
      },
      bankerCustodyPosition: {
        async findMany(args) {
          receivedArgs.push(args);
          return [];
        },
        async upsert(args) {
          receivedArgs.push(args);
        },
        async deleteMany(args) {
          receivedArgs.push(args);
        },
      },
      transfer: {
        async create(args) {
          receivedArgs.push(args);
        },
      },
      custodyPlacement: {
        async create() {},
      },
      custodyRedemption: {
        async create() {},
      },
      custodyAccrual: {
        async createMany() {},
      },
      ...createMarketPersistenceDelegates(),
      deposit: {
        async create() {},
      },
      withdrawal: {
        async create() {},
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
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('60.0000')),
            depositAccount: DepositAccount.open(),
          }),
          new GameAgent({
            id: 'agent-2',
            name: 'Analyst Bot',
            role: 'analyst',
            balance: AccountBalance.open(Money.fromDecimal('65.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
      }),
      [
        {
          type: 'transfer',
          gameSessionId: 'game-1',
          sourceAgentId: 'agent-1',
          destinationAgentId: 'agent-2',
          amount: '40.0000',
        },
      ],
    );

    expect(receivedArgs).toContainEqual({
      data: {
        gameSessionId: 'game-1',
        sourceAgentId: 'agent-1',
        destinationAgentId: 'agent-2',
        amount: '40.0000',
      },
    });
  });
});
