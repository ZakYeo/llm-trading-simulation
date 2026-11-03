import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AdvanceGameRoundUseCase } from './advance-game-round.use-case.js';
import { DepositToBankUseCase } from './deposit-to-bank.use-case.js';
import { GetGameSessionUseCase } from './get-game-session.use-case.js';
import { PlaceFundsWithBankerUseCase } from './place-funds-with-banker.use-case.js';
import { RedeemFundsFromBankerUseCase } from './redeem-funds-from-banker.use-case.js';
import { TransferFundsUseCase } from './transfer-funds.use-case.js';
import { WithdrawFromBankUseCase } from './withdraw-from-bank.use-case.js';
import { RandomIdGenerator } from '../../../shared/infrastructure/id/random-id-generator.js';
import {
  type PrismaClient,
  createPrismaClient,
} from '../../../shared/infrastructure/prisma/prisma-client.js';
import type { PrismaClientLike } from '../../infrastructure/prisma/game-session-prisma.contracts.js';
import { PrismaGameSessionRepository } from '../../infrastructure/prisma/prisma-game-session.repository.js';
import { CreateGameSessionUseCase } from './create-game-session.use-case.js';
import { LedgerService } from '../../domain/services/ledger.service.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(Boolean(testDatabaseUrl))('Game money flows integration', () => {
  let prisma: PrismaClient;
  let createGameSessionUseCase: CreateGameSessionUseCase;
  let getGameSessionUseCase: GetGameSessionUseCase;
  let advanceGameRoundUseCase: AdvanceGameRoundUseCase;
  let depositToBankUseCase: DepositToBankUseCase;
  let withdrawFromBankUseCase: WithdrawFromBankUseCase;
  let transferFundsUseCase: TransferFundsUseCase;
  let placeFundsWithBankerUseCase: PlaceFundsWithBankerUseCase;
  let redeemFundsFromBankerUseCase: RedeemFundsFromBankerUseCase;

  beforeAll(async () => {
    prisma = createPrismaClient(testDatabaseUrl);

    const repository = new PrismaGameSessionRepository(
      prisma as unknown as PrismaClientLike,
    );
    const ledgerService = new LedgerService();

    createGameSessionUseCase = new CreateGameSessionUseCase(
      repository,
      new RandomIdGenerator(),
    );
    getGameSessionUseCase = new GetGameSessionUseCase(repository);
    advanceGameRoundUseCase = new AdvanceGameRoundUseCase(repository);
    depositToBankUseCase = new DepositToBankUseCase(repository, ledgerService);
    withdrawFromBankUseCase = new WithdrawFromBankUseCase(
      repository,
      ledgerService,
    );
    transferFundsUseCase = new TransferFundsUseCase(repository, ledgerService);
    placeFundsWithBankerUseCase = new PlaceFundsWithBankerUseCase(
      repository,
      ledgerService,
    );
    redeemFundsFromBankerUseCase = new RedeemFundsFromBankerUseCase(
      repository,
      ledgerService,
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

  it('persists transfer, deposit, and withdraw state transitions against postgres', async () => {
    const createdSession = await createGameSessionUseCase.execute({
      name: 'Integration Flow Table',
      initialBalance: '100.0000',
      agents: [
        { name: 'Banker Bot', role: 'banker' },
        { name: 'Analyst Bot', role: 'analyst' },
        { name: 'Lawyer Bot', role: 'lawyer' },
        { name: 'Influencer Bot', role: 'influencer' },
        { name: 'Trader Bot', role: 'trader' },
      ],
    });

    const banker = createdSession.agents.find(
      (agent) => agent.role === 'banker',
    );
    const trader = createdSession.agents.find(
      (agent) => agent.role === 'trader',
    );

    expect(banker).toBeDefined();
    expect(trader).toBeDefined();

    await transferFundsUseCase.execute({
      gameSessionId: createdSession.id,
      sourceAgentId: trader!.id,
      destinationAgentId: banker!.id,
      amount: '15.0000',
    });

    await depositToBankUseCase.execute({
      gameSessionId: createdSession.id,
      agentId: banker!.id,
      amount: '20.0000',
    });

    await withdrawFromBankUseCase.execute({
      gameSessionId: createdSession.id,
      agentId: banker!.id,
      amount: '5.0000',
    });

    const persistedSession = await getGameSessionUseCase.execute({
      gameSessionId: createdSession.id,
    });
    const persistedBanker = persistedSession.agents.find(
      (agent) => agent.id === banker!.id,
    );
    const persistedTrader = persistedSession.agents.find(
      (agent) => agent.id === trader!.id,
    );

    expect(persistedBanker?.balance.available.toDecimal()).toBe('100.0000');
    expect(persistedBanker?.depositAccount.principal.toDecimal()).toBe(
      '15.0000',
    );
    expect(persistedBanker?.depositAccount.accruedInterest.toDecimal()).toBe(
      '0.0000',
    );
    expect(persistedTrader?.balance.available.toDecimal()).toBe('85.0000');

    const transfers = await prisma.transfer.findMany({
      where: { gameSessionId: createdSession.id },
    });
    const deposits = await prisma.deposit.findMany({
      where: { gameSessionId: createdSession.id },
    });
    const withdrawals = await prisma.withdrawal.findMany({
      where: { gameSessionId: createdSession.id },
    });

    expect(transfers).toHaveLength(1);
    expect(transfers[0]?.amount.toString()).toBe('15');
    expect(deposits).toHaveLength(1);
    expect(deposits[0]?.amount.toString()).toBe('20');
    expect(withdrawals).toHaveLength(1);
    expect(withdrawals[0]?.amount.toString()).toBe('5');
  });

  it('persists banker custody placement, accrual, and redemption against postgres', async () => {
    const createdSession = await createGameSessionUseCase.execute({
      name: 'Round Flow Table',
      initialBalance: '100.0000',
      agents: [
        { name: 'Banker Bot', role: 'banker' },
        { name: 'Analyst Bot', role: 'analyst' },
        { name: 'Lawyer Bot', role: 'lawyer' },
        { name: 'Influencer Bot', role: 'influencer' },
        { name: 'Trader Bot', role: 'trader' },
      ],
    });

    const banker = createdSession.agents.find(
      (agent) => agent.role === 'banker',
    );
    const trader = createdSession.agents.find(
      (agent) => agent.role === 'trader',
    );

    expect(banker).toBeDefined();
    expect(trader).toBeDefined();

    await placeFundsWithBankerUseCase.negotiate(
      createdSession.id,
      'request-1',
      trader!.id,
      banker!.id,
      { requestAmount: '40' },
    );
    await placeFundsWithBankerUseCase.negotiate(
      createdSession.id,
      'offer-1',
      banker!.id,
      trader!.id,
      { requestId: 'request-1', offerAmount: '40', rateBps: 250 },
    );
    await placeFundsWithBankerUseCase.execute({
      offerId: 'offer-1',
      gameSessionId: createdSession.id,
      ownerAgentId: trader!.id,
      bankerAgentId: banker!.id,
      amount: '40.0000',
    });

    await advanceGameRoundUseCase.execute({
      gameSessionId: createdSession.id,
    });

    await redeemFundsFromBankerUseCase.execute({
      gameSessionId: createdSession.id,
      ownerAgentId: trader!.id,
      bankerAgentId: banker!.id,
      amount: '5.0000',
    });

    const persistedSession = await getGameSessionUseCase.execute({
      gameSessionId: createdSession.id,
    });
    const persistedBanker = persistedSession.agents.find(
      (agent) => agent.id === banker!.id,
    );
    const persistedTrader = persistedSession.agents.find(
      (agent) => agent.id === trader!.id,
    );

    expect(persistedSession.status).toBe('active');
    expect(persistedSession.currentRound).toBe(2);
    expect(persistedBanker?.balance.available.toDecimal()).toBe('136.0000');
    expect(persistedBanker?.depositAccount.accruedInterest.toDecimal()).toBe(
      '0.0000',
    );
    expect(persistedTrader?.balance.available.toDecimal()).toBe('65.0000');
    expect(persistedSession.bankerCustodyPositions).toHaveLength(1);
    expect(
      persistedSession.bankerCustodyPositions[0]?.principal.toDecimal(),
    ).toBe('36.0000');
    expect(
      persistedSession.bankerCustodyPositions[0]?.accruedInterest.toDecimal(),
    ).toBe('0.0000');
  });
  it('accepts an offer once under concurrency and preserves negotiated accounting', async () => {
    const session = await createGameSessionUseCase.execute({
      name: 'Concurrent deposits',
      initialBalance: '100',
      agents: [
        { name: 'Banker', role: 'banker' },
        { name: 'Trader', role: 'trader' },
      ],
    });
    const banker = session.agents.find((a) => a.role === 'banker')!;
    const trader = session.agents.find((a) => a.role === 'trader')!;
    await placeFundsWithBankerUseCase.negotiate(
      session.id,
      'request',
      trader.id,
      banker.id,
      { requestAmount: '20' },
    );
    await placeFundsWithBankerUseCase.negotiate(
      session.id,
      'offer',
      banker.id,
      trader.id,
      { requestId: 'request', offerAmount: '20', rateBps: 100 },
    );
    const deposit = {
      gameSessionId: session.id,
      ownerAgentId: trader.id,
      bankerAgentId: banker.id,
      amount: '20',
      offerId: 'offer',
    };
    const outcomes = await Promise.allSettled([
      placeFundsWithBankerUseCase.execute(deposit),
      placeFundsWithBankerUseCase.execute(deposit),
    ]);
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
    expect(
      await prisma.custodyPlacement.count({
        where: { gameSessionId: session.id },
      }),
    ).toBe(1);
    const advanced = await advanceGameRoundUseCase.execute({
      gameSessionId: session.id,
    });
    expect(
      advanced.bankerCustodyPositions[0]?.accruedInterest.toDecimal(),
    ).toBe('0.2000');
    expect(
      advanced.agents
        .find((a) => a.id === banker.id)
        ?.balance.available.toDecimal(),
    ).toBe('120.5000');
    const accrual = await prisma.custodyAccrual.findFirst({
      where: { gameSessionId: session.id },
    });
    expect(accrual?.bankerIncome.toString()).toBe('0.3');
    await expect(
      placeFundsWithBankerUseCase.negotiate(
        session.id,
        'stale',
        trader.id,
        banker.id,
        { requestAmount: '10' },
        undefined,
        session.revision,
      ),
    ).rejects.toThrow('session changed');
  });

  it('rolls back negotiations when the private message cannot be persisted', async () => {
    const session = await createGameSessionUseCase.execute({
      name: 'Atomic request',
      initialBalance: '100',
      agents: [
        { name: 'Banker', role: 'banker' },
        { name: 'Trader', role: 'trader' },
      ],
    });
    const banker = session.agents.find((a) => a.role === 'banker')!;
    const trader = session.agents.find((a) => a.role === 'trader')!;
    await expect(
      placeFundsWithBankerUseCase.negotiate(
        session.id,
        'request',
        trader.id,
        banker.id,
        { requestAmount: '20' },
        {
          type: 'negotiation_message',
          id: 'invalid-message',
          gameSessionId: session.id,
          senderAgentId: 'nonexistent-agent',
          recipientAgentId: banker.id,
          roundNumber: session.currentRound,
          turnNumber: 1,
          content: 'Request',
          createdAt: new Date().toISOString(),
        },
      ),
    ).rejects.toThrow();
    const restored = await getGameSessionUseCase.execute({
      gameSessionId: session.id,
    });
    expect(restored.depositNegotiations).toEqual([]);
    expect(
      await prisma.agentMessage.count({ where: { gameSessionId: session.id } }),
    ).toBe(0);
  });
});
