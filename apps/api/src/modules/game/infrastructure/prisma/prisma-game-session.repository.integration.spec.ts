import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { PrismaGameSessionRepository } from './prisma-game-session.repository.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(Boolean(testDatabaseUrl))(
  'PrismaGameSessionRepository integration',
  () => {
    let prisma: PrismaClient;
    let repository: PrismaGameSessionRepository;

    beforeAll(async () => {
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: testDatabaseUrl,
          },
        },
      });
      repository = new PrismaGameSessionRepository(prisma);
      await prisma.$connect();
    });

    beforeEach(async () => {
      await prisma.gameSession.deleteMany();
    });

    afterAll(async () => {
      await prisma.gameSession.deleteMany();
      await prisma.$disconnect();
    });

    it('persists and hydrates a game session against a real postgres database', async () => {
      const session = new GameSession({
        id: 'game-int-1',
        name: 'Integration Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-int-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.restore(
              Money.fromDecimal('75.0000'),
              Money.fromDecimal('25.0000'),
            ),
            depositAccount: DepositAccount.restore(
              Money.fromDecimal('10.0000'),
              Money.fromDecimal('2.0000'),
            ),
          }),
          new GameAgent({
            id: 'agent-int-2',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('100.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
      });

      await repository.save(session);

      const persisted = await repository.findById(session.id);

      expect(persisted?.id).toBe('game-int-1');
      expect(persisted?.agents).toHaveLength(2);
      expect(persisted?.agents[0]?.balance.available.toDecimal()).toBe(
        '75.0000',
      );
      expect(persisted?.agents[0]?.balance.reserved.toDecimal()).toBe(
        '25.0000',
      );
      expect(persisted?.agents[0]?.depositAccount.principal.toDecimal()).toBe(
        '10.0000',
      );
      expect(
        persisted?.agents[0]?.depositAccount.accruedInterest.toDecimal(),
      ).toBe('2.0000');
    });
  },
);
