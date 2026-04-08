import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { GameController } from './game.controller.js';

function createSessionFixture() {
  return new GameSession({
    id: 'game-1',
    name: 'Founders Table',
    status: 'setup',
    currentRound: 0,
    agents: [
      new GameAgent({
        id: 'agent-1',
        name: 'Banker Bot',
        role: 'banker',
        balance: AccountBalance.open(Money.fromDecimal('100.0000')),
        depositAccount: DepositAccount.restore(
          Money.fromDecimal('15.0000'),
          Money.zero(),
        ),
      }),
      new GameAgent({
        id: 'agent-2',
        name: 'Trader Bot',
        role: 'trader',
        balance: AccountBalance.open(Money.fromDecimal('85.0000')),
        depositAccount: DepositAccount.open(),
      }),
    ],
  });
}

describe('GameController', () => {
  it('creates a session from a validated request payload', async () => {
    const createGameSessionUseCase = {
      execute: vi.fn().mockResolvedValue(createSessionFixture()),
    };
    const getGameSessionUseCase = { execute: vi.fn() };
    const depositToBankUseCase = { execute: vi.fn() };
    const withdrawFromBankUseCase = { execute: vi.fn() };
    const transferFundsUseCase = { execute: vi.fn() };

    const controller = new GameController(
      createGameSessionUseCase as never,
      getGameSessionUseCase as never,
      { execute: vi.fn() } as never,
      depositToBankUseCase as never,
      withdrawFromBankUseCase as never,
      transferFundsUseCase as never,
    );

    const result = await controller.createSession({
      name: 'Founders Table',
      initialBalance: '100.0000',
      agents: [
        { name: 'Banker Bot', role: 'banker' },
        { name: 'Lawyer Bot', role: 'lawyer' },
        { name: 'Trader Bot Alpha', role: 'trader' },
        { name: 'Trader Bot Beta', role: 'trader' },
      ],
    });

    expect(createGameSessionUseCase.execute).toHaveBeenCalledWith({
      name: 'Founders Table',
      initialBalance: '100.0000',
      agents: [
        { name: 'Banker Bot', role: 'banker' },
        { name: 'Lawyer Bot', role: 'lawyer' },
        { name: 'Trader Bot Alpha', role: 'trader' },
        { name: 'Trader Bot Beta', role: 'trader' },
      ],
    });
    expect(result).toEqual({
      id: 'game-1',
      name: 'Founders Table',
      status: 'setup',
      currentRound: 0,
      agents: [
        {
          id: 'agent-1',
          name: 'Banker Bot',
          role: 'banker',
          availableBalance: '100.0000',
          reservedBalance: '0.0000',
          depositPrincipal: '15.0000',
          depositAccruedInterest: '0.0000',
        },
        {
          id: 'agent-2',
          name: 'Trader Bot',
          role: 'trader',
          availableBalance: '85.0000',
          reservedBalance: '0.0000',
          depositPrincipal: '0.0000',
          depositAccruedInterest: '0.0000',
        },
      ],
    });
  });

  it('rejects invalid request payloads before calling the use case', async () => {
    const createGameSessionUseCase = {
      execute: vi.fn(),
    };
    const controller = new GameController(
      createGameSessionUseCase as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
    );

    await expect(
      controller.createSession({
        name: '',
        initialBalance: '100.00000',
        agents: [],
      }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(createGameSessionUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns a session by id', async () => {
    const getGameSessionUseCase = {
      execute: vi.fn().mockResolvedValue(createSessionFixture()),
    };
    const controller = new GameController(
      { execute: vi.fn() } as never,
      getGameSessionUseCase as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
    );

    const result = await controller.getSession('game-1');

    expect(getGameSessionUseCase.execute).toHaveBeenCalledWith({
      gameSessionId: 'game-1',
    });
    expect(result.id).toBe('game-1');
    expect(result.agents).toHaveLength(2);
  });

  it('routes round advancement through a validated request payload', async () => {
    const advanceGameRoundUseCase = {
      execute: vi.fn().mockResolvedValue(createSessionFixture()),
    };
    const controller = new GameController(
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      advanceGameRoundUseCase as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
    );

    await controller.advanceRound('game-1', {
      interestRateBps: 250,
    });

    expect(advanceGameRoundUseCase.execute).toHaveBeenCalledWith({
      gameSessionId: 'game-1',
      interestRateBps: 250,
    });
  });

  it('routes deposits, withdrawals, and transfers through validated request payloads', async () => {
    const depositToBankUseCase = {
      execute: vi.fn().mockResolvedValue(createSessionFixture()),
    };
    const withdrawFromBankUseCase = {
      execute: vi.fn().mockResolvedValue(createSessionFixture()),
    };
    const transferFundsUseCase = {
      execute: vi.fn().mockResolvedValue(createSessionFixture()),
    };
    const controller = new GameController(
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      depositToBankUseCase as never,
      withdrawFromBankUseCase as never,
      transferFundsUseCase as never,
    );

    await controller.depositToBank('game-1', {
      agentId: 'agent-1',
      amount: '20.0000',
    });
    await controller.withdrawFromBank('game-1', {
      agentId: 'agent-1',
      amount: '5.0000',
    });
    await controller.transferFunds('game-1', {
      sourceAgentId: 'agent-2',
      destinationAgentId: 'agent-1',
      amount: '15.0000',
    });

    expect(depositToBankUseCase.execute).toHaveBeenCalledWith({
      gameSessionId: 'game-1',
      agentId: 'agent-1',
      amount: '20.0000',
    });
    expect(withdrawFromBankUseCase.execute).toHaveBeenCalledWith({
      gameSessionId: 'game-1',
      agentId: 'agent-1',
      amount: '5.0000',
    });
    expect(transferFundsUseCase.execute).toHaveBeenCalledWith({
      gameSessionId: 'game-1',
      sourceAgentId: 'agent-2',
      destinationAgentId: 'agent-1',
      amount: '15.0000',
    });
  });

  it('rejects invalid deposit, withdraw, and transfer payloads before calling use cases', async () => {
    const advanceGameRoundUseCase = { execute: vi.fn() };
    const depositToBankUseCase = { execute: vi.fn() };
    const withdrawFromBankUseCase = { execute: vi.fn() };
    const transferFundsUseCase = { execute: vi.fn() };
    const controller = new GameController(
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      advanceGameRoundUseCase as never,
      depositToBankUseCase as never,
      withdrawFromBankUseCase as never,
      transferFundsUseCase as never,
    );

    await expect(
      controller.advanceRound('game-1', {
        interestRateBps: -1,
      }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      controller.depositToBank('game-1', {
        agentId: '',
        amount: '20.00000',
      }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      controller.withdrawFromBank('game-1', {
        agentId: '',
        amount: '5.00000',
      }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      controller.transferFunds('game-1', {
        sourceAgentId: '',
        destinationAgentId: '',
        amount: '15.00000',
      }),
    ).rejects.toBeInstanceOf(ZodError);

    expect(advanceGameRoundUseCase.execute).not.toHaveBeenCalled();
    expect(depositToBankUseCase.execute).not.toHaveBeenCalled();
    expect(withdrawFromBankUseCase.execute).not.toHaveBeenCalled();
    expect(transferFundsUseCase.execute).not.toHaveBeenCalled();
  });
});
