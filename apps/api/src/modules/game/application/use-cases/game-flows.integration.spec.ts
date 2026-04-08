import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AdvanceGameRoundUseCase } from './advance-game-round.use-case.js';
import { DepositToBankUseCase } from './deposit-to-bank.use-case.js';
import { GetGameSessionUseCase } from './get-game-session.use-case.js';
import { TransferFundsUseCase } from './transfer-funds.use-case.js';
import { WithdrawFromBankUseCase } from './withdraw-from-bank.use-case.js';
import { RandomIdGenerator } from '../../../shared/infrastructure/id/random-id-generator.js';
import {
  type PrismaClient,
  createPrismaClient,
} from '../../../shared/infrastructure/prisma/prisma-client.js';
import { LedgerService } from '../../domain/services/ledger.service.js';
import type { PrismaClientLike } from '../../infrastructure/prisma/game-session-prisma.contracts.js';
import { PrismaGameSessionRepository } from '../../infrastructure/prisma/prisma-game-session.repository.js';
import { CreateGameSessionUseCase } from './create-game-session.use-case.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(Boolean(testDatabaseUrl))('Game money flows integration', () => {
  let prisma: PrismaClient;
  let createGameSessionUseCase: CreateGameSessionUseCase;
  let getGameSessionUseCase: GetGameSessionUseCase;
  let advanceGameRoundUseCase: AdvanceGameRoundUseCase;
  let depositToBankUseCase: DepositToBankUseCase;
  let withdrawFromBankUseCase: WithdrawFromBankUseCase;
  let transferFundsUseCase: TransferFundsUseCase;

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
    advanceGameRoundUseCase = new AdvanceGameRoundUseCase(
      repository,
      ledgerService,
    );
    depositToBankUseCase = new DepositToBankUseCase(repository, ledgerService);
    withdrawFromBankUseCase = new WithdrawFromBankUseCase(
      repository,
      ledgerService,
    );
    transferFundsUseCase = new TransferFundsUseCase(repository, ledgerService);

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

  it('persists round advancement and accrued interest against postgres', async () => {
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

    expect(banker).toBeDefined();

    await depositToBankUseCase.execute({
      gameSessionId: createdSession.id,
      agentId: banker!.id,
      amount: '40.0000',
    });

    await advanceGameRoundUseCase.execute({
      gameSessionId: createdSession.id,
      interestRateBps: 250,
    });

    const persistedSession = await getGameSessionUseCase.execute({
      gameSessionId: createdSession.id,
    });
    const persistedBanker = persistedSession.agents.find(
      (agent) => agent.id === banker!.id,
    );

    expect(persistedSession.status).toBe('active');
    expect(persistedSession.currentRound).toBe(1);
    expect(persistedBanker?.depositAccount.principal.toDecimal()).toBe(
      '40.0000',
    );
    expect(persistedBanker?.depositAccount.accruedInterest.toDecimal()).toBe(
      '1.0000',
    );
  });
});
