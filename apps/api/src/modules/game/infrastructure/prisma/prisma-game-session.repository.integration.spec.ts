import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { BankerCustodyPosition } from '../../domain/entities/banker-custody-position.js';
import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import {
  type PrismaClient,
  createPrismaClient,
} from '../../../shared/infrastructure/prisma/prisma-client.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import type { PrismaClientLike } from './game-session-prisma.contracts.js';
import { PrismaGameSessionRepository } from './prisma-game-session.repository.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(Boolean(testDatabaseUrl))(
  'PrismaGameSessionRepository integration',
  () => {
    let prisma: PrismaClient;
    let repository: PrismaGameSessionRepository;

    beforeAll(async () => {
      prisma = createPrismaClient(testDatabaseUrl);
      repository = new PrismaGameSessionRepository(
        prisma as unknown as PrismaClientLike,
      );
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
        bankerCustodyPositions: [
          new BankerCustodyPosition({
            bankerAgentId: 'agent-int-1',
            ownerAgentId: 'agent-int-2',
            principal: Money.fromDecimal('12.0000'),
            accruedInterest: Money.fromDecimal('0.7500'),
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
      expect(persisted?.bankerCustodyPositions).toHaveLength(1);
      expect(persisted?.bankerCustodyPositions[0]?.principal.toDecimal()).toBe(
        '12.0000',
      );
      expect(
        persisted?.bankerCustodyPositions[0]?.accruedInterest.toDecimal(),
      ).toBe('0.7500');
    });

    it('preserves durable round history when a session advances and is saved again', async () => {
      const initialSession = new GameSession({
        id: 'game-int-rounds',
        name: 'Round Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-int-1',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('100.0000')),
            depositAccount: DepositAccount.open(),
          }),
        ],
      });

      await repository.save(initialSession);
      await repository.save(initialSession.advanceRound());
      await repository.save(initialSession.advanceRound().advanceRound());

      const rounds = await prisma.gameRound.findMany({
        where: { gameSessionId: initialSession.id },
        orderBy: { roundNumber: 'asc' },
      });
      const persisted = await repository.findById(initialSession.id);

      expect(persisted?.currentRound).toBe(2);
      expect(rounds.map((round) => round.roundNumber)).toEqual([1, 2]);
    });

    it('persists durable transfer, deposit, and withdrawal records', async () => {
      const session = new GameSession({
        id: 'game-int-ledger',
        name: 'Ledger Table',
        status: 'setup',
        currentRound: 0,
        agents: [
          new GameAgent({
            id: 'agent-int-1',
            name: 'Trader Bot',
            role: 'trader',
            balance: AccountBalance.open(Money.fromDecimal('60.0000')),
            depositAccount: DepositAccount.open(),
          }),
          new GameAgent({
            id: 'agent-int-2',
            name: 'Banker Bot',
            role: 'banker',
            balance: AccountBalance.open(Money.fromDecimal('65.0000')),
            depositAccount: DepositAccount.restore(
              Money.fromDecimal('15.0000'),
              Money.zero(),
            ),
          }),
        ],
      });

      await repository.save(session);
      await repository.save(session, [
        {
          type: 'transfer',
          gameSessionId: session.id,
          sourceAgentId: 'agent-int-1',
          destinationAgentId: 'agent-int-2',
          amount: '40.0000',
        },
      ]);
      await repository.save(session, [
        {
          type: 'deposit',
          gameSessionId: session.id,
          agentId: 'agent-int-2',
          amount: '20.0000',
        },
      ]);
      await repository.save(session, [
        {
          type: 'withdrawal',
          gameSessionId: session.id,
          agentId: 'agent-int-2',
          amount: '5.0000',
        },
      ]);

      const transfers = await prisma.transfer.findMany({
        where: { gameSessionId: session.id },
      });
      const deposits = await prisma.deposit.findMany({
        where: { gameSessionId: session.id },
      });
      const withdrawals = await prisma.withdrawal.findMany({
        where: { gameSessionId: session.id },
      });

      expect(transfers).toHaveLength(1);
      expect(transfers[0]?.amount.toString()).toBe('40');
      expect(deposits).toHaveLength(1);
      expect(deposits[0]?.amount.toString()).toBe('20');
      expect(withdrawals).toHaveLength(1);
      expect(withdrawals[0]?.amount.toString()).toBe('5');
    });
  },
);
