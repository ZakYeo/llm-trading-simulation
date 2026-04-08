import { describe, expect, it } from 'vitest';

import type { AgentAction } from '@llm-sim/mcp-contracts';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import type { GameSessionRepositoryPort } from '../../../game/application/ports/game-session-repository.port.js';
import { AccountBalance } from '../../../game/domain/entities/account-balance.js';
import { GameAgent } from '../../../game/domain/entities/game-agent.js';
import { GameSession } from '../../../game/domain/entities/game-session.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import type { AgentGatewayPort } from '../ports/agent-gateway.port.js';
import type {
  AgentMessageRecord,
  AgentMessageRepositoryPort,
} from '../ports/agent-message-repository.port.js';
import { RunAgentCommunicationTurnUseCase } from './run-agent-communication-turn.use-case.js';

class InMemoryGameSessionRepository implements GameSessionRepositoryPort {
  constructor(private readonly session: GameSession | null) {}

  async save(): Promise<void> {}
  async saveWithTransfer(): Promise<void> {}
  async saveWithDeposit(): Promise<void> {}
  async saveWithWithdrawal(): Promise<void> {}

  async findById(id: string): Promise<GameSession | null> {
    if (this.session?.id === id) {
      return this.session;
    }

    return null;
  }
}

class InMemoryAgentMessageRepository implements AgentMessageRepositoryPort {
  saved: AgentMessageRecord[] = [];

  async save(message: AgentMessageRecord): Promise<AgentMessageRecord> {
    const saved = {
      ...message,
      id: `message-${this.saved.length + 1}`,
      createdAt: new Date(
        Date.UTC(2026, 3, 8, 10, 0, this.saved.length),
      ).toISOString(),
    };
    this.saved.push(saved);
    return saved;
  }

  async findRecentByGameSessionId(): Promise<AgentMessageRecord[]> {
    return [...this.saved];
  }
}

class ScriptedAgentGateway implements AgentGatewayPort {
  private index = 0;

  constructor(private readonly actions: AgentAction[]) {}

  async decideNextAction(): Promise<AgentAction> {
    const action = this.actions[this.index];

    if (!action) {
      return { type: 'finalize_turn' };
    }

    this.index += 1;
    return action;
  }
}

function createSession() {
  return new GameSession({
    id: 'game-1',
    name: 'Communication Table',
    status: 'active',
    currentRound: 1,
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
  });
}

describe('RunAgentCommunicationTurnUseCase', () => {
  it('persists agent messages produced during an orchestrated communication turn', async () => {
    const useCase = new RunAgentCommunicationTurnUseCase(
      new InMemoryGameSessionRepository(createSession()),
      new InMemoryAgentMessageRepository(),
      new ScriptedAgentGateway([
        {
          type: 'send_private_message',
          recipientAgentId: 'agent-2',
          content: 'I can offer funding if you show momentum.',
        },
        {
          type: 'send_public_message',
          content: 'I am looking for growth capital this round.',
        },
      ]),
    );

    const result = await useCase.execute({
      gameSessionId: 'game-1',
    });

    expect(result.actions).toHaveLength(2);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toMatchObject({
      senderAgentId: 'agent-1',
      recipientAgentId: 'agent-2',
      visibility: 'private',
    });
    expect(result.messages[1]).toMatchObject({
      senderAgentId: 'agent-2',
      recipientAgentId: null,
      visibility: 'public',
    });
  });
});
