import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';
import { GameController } from './game.controller.js';

describe('GameController', () => {
  it('creates a session from a validated request payload', async () => {
    const createGameSessionUseCase = {
      execute: vi.fn().mockResolvedValue(
        new GameSession({
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
              depositAccount: DepositAccount.open(),
            }),
          ],
        }),
      ),
    };

    const controller = new GameController(createGameSessionUseCase as never);

    const result = await controller.createSession({
      name: 'Founders Table',
      initialBalance: '100.0000',
      agents: [
        { name: 'Banker Bot', role: 'banker' },
        { name: 'Analyst Bot', role: 'analyst' },
        { name: 'Lawyer Bot', role: 'lawyer' },
        { name: 'Influencer Bot', role: 'influencer' },
        { name: 'Trader Bot', role: 'trader' },
      ],
    });

    expect(createGameSessionUseCase.execute).toHaveBeenCalledWith({
      name: 'Founders Table',
      initialBalance: '100.0000',
      agents: [
        { name: 'Banker Bot', role: 'banker' },
        { name: 'Analyst Bot', role: 'analyst' },
        { name: 'Lawyer Bot', role: 'lawyer' },
        { name: 'Influencer Bot', role: 'influencer' },
        { name: 'Trader Bot', role: 'trader' },
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
    const controller = new GameController(createGameSessionUseCase as never);

    await expect(
      controller.createSession({
        name: '',
        initialBalance: '100.00000',
        agents: [],
      }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(createGameSessionUseCase.execute).not.toHaveBeenCalled();
  });
});
