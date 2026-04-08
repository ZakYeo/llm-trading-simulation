import { describe, expect, it } from 'vitest';

import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import type { GameSessionRepositoryPort } from '../../../game/application/ports/game-session-repository.port.js';
import { AccountBalance } from '../../../game/domain/entities/account-balance.js';
import { GameAgent } from '../../../game/domain/entities/game-agent.js';
import { GameSession } from '../../../game/domain/entities/game-session.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { AgentGatewayPort } from '../ports/agent-gateway.port.js';
import type {
  AgentActionRecord,
  AgentActionRepositoryPort,
} from '../ports/agent-action-repository.port.js';
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

class InMemoryAgentActionRepository implements AgentActionRepositoryPort {
  saved: AgentActionRecord[] = [];

  async save(action: AgentActionRecord): Promise<AgentActionRecord> {
    const saved = {
      ...action,
      id: `action-${this.saved.length + 1}`,
      createdAt: new Date(
        Date.UTC(2026, 3, 8, 10, 0, this.saved.length),
      ).toISOString(),
    };
    this.saved.push(saved);
    return saved;
  }

  async findRecentByGameSessionId(): Promise<AgentActionRecord[]> {
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

class RecordingAgentGateway implements AgentGatewayPort {
  contexts: AgentTurnContext[] = [];

  async decideNextAction(context: AgentTurnContext): Promise<AgentAction> {
    this.contexts.push(context);
    return {
      type: 'finalize_turn',
    };
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
  it('persists agent actions and messages produced during an orchestrated communication turn', async () => {
    const useCase = new RunAgentCommunicationTurnUseCase(
      new InMemoryGameSessionRepository(createSession()),
      new InMemoryAgentMessageRepository(),
      new InMemoryAgentActionRepository(),
      new ScriptedAgentGateway([
        {
          type: 'send_private_message',
          recipientAgentId: 'agent-2',
          content: 'I can offer funding if you show momentum.',
        },
        {
          type: 'propose_direct_transfer',
          recipientAgentId: 'agent-1',
          amount: '15.0000',
          rationale: 'I can turn this into a higher-return trade quickly.',
        },
      ]),
    );

    const result = await useCase.execute({
      gameSessionId: 'game-1',
      turnNumber: 2,
    });

    expect(result.turnNumber).toBe(2);
    expect(result.actions).toHaveLength(2);
    expect(result.actionRecords).toHaveLength(2);
    expect(result.messages).toHaveLength(1);
    expect(result.actionRecords[0]).toMatchObject({
      agentId: 'agent-1',
      recipientAgentId: 'agent-2',
      actionType: 'send_private_message',
      turnNumber: 2,
    });
    expect(result.actionRecords[1]).toMatchObject({
      agentId: 'agent-2',
      recipientAgentId: 'agent-1',
      actionType: 'propose_direct_transfer',
      amount: '15.0000',
      content: 'I can turn this into a higher-return trade quickly.',
      turnNumber: 2,
    });
    expect(result.messages[0]).toMatchObject({
      senderAgentId: 'agent-1',
      recipientAgentId: 'agent-2',
      visibility: 'private',
      turnNumber: 2,
    });
  });

  it('rejects resolving a proposal that has already been accepted or rejected', async () => {
    const actionRepository = new InMemoryAgentActionRepository();
    await actionRepository.save({
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 2,
      agentId: 'agent-2',
      recipientAgentId: 'agent-1',
      actionType: 'propose_direct_transfer',
      amount: '15.0000',
      content: 'I can turn this into a higher-return trade quickly.',
    });
    await actionRepository.save({
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 3,
      agentId: 'agent-1',
      recipientAgentId: null,
      actionType: 'accept_direct_transfer_proposal',
      relatedProposalActionId: 'action-1',
    });

    const useCase = new RunAgentCommunicationTurnUseCase(
      new InMemoryGameSessionRepository(createSession()),
      new InMemoryAgentMessageRepository(),
      actionRepository,
      new ScriptedAgentGateway([
        {
          type: 'reject_direct_transfer_proposal',
          proposalActionId: 'action-1',
          rationale: 'This should not be allowed twice.',
        },
        {
          type: 'finalize_turn',
        },
      ]),
    );

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        turnNumber: 4,
      }),
    ).rejects.toThrow(DomainInvariantError);
  });

  it('persists a counter-proposal as the proposal recipient response', async () => {
    const actionRepository = new InMemoryAgentActionRepository();
    await actionRepository.save({
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 2,
      agentId: 'agent-2',
      recipientAgentId: 'agent-1',
      actionType: 'propose_direct_transfer',
      amount: '15.0000',
      content: 'I can turn this into a higher-return trade quickly.',
    });

    const useCase = new RunAgentCommunicationTurnUseCase(
      new InMemoryGameSessionRepository(createSession()),
      new InMemoryAgentMessageRepository(),
      actionRepository,
      new ScriptedAgentGateway([
        {
          type: 'counter_direct_transfer_proposal',
          proposalActionId: 'action-1',
          recipientAgentId: 'agent-2',
          amount: '8.5000',
          rationale: 'I can fund this trade, but only at a lower amount.',
        },
        {
          type: 'finalize_turn',
        },
      ]),
    );

    const result = await useCase.execute({
      gameSessionId: 'game-1',
      turnNumber: 3,
    });

    expect(result.actionRecords[0]).toMatchObject({
      agentId: 'agent-1',
      recipientAgentId: 'agent-2',
      actionType: 'counter_direct_transfer_proposal',
      relatedProposalActionId: 'action-1',
      amount: '8.5000',
      content: 'I can fund this trade, but only at a lower amount.',
      turnNumber: 3,
    });
  });

  it('provides the gateway with economic context and action semantics', async () => {
    const actionRepository = new InMemoryAgentActionRepository();
    const messageRepository = new InMemoryAgentMessageRepository();
    await messageRepository.save({
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 1,
      senderAgentId: 'agent-1',
      recipientAgentId: 'agent-2',
      visibility: 'private',
      content: 'I can offer funding if your setup is strong enough.',
    });
    await messageRepository.save({
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 2,
      senderAgentId: 'agent-2',
      recipientAgentId: 'agent-1',
      visibility: 'private',
      content: 'I would take capital if the terms are competitive.',
    });
    await actionRepository.save({
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 2,
      agentId: 'agent-2',
      recipientAgentId: 'agent-1',
      actionType: 'propose_direct_transfer',
      amount: '15.0000',
      content: 'I can turn this into a higher-return trade quickly.',
    });

    const gateway = new RecordingAgentGateway();
    const useCase = new RunAgentCommunicationTurnUseCase(
      new InMemoryGameSessionRepository(createSession()),
      messageRepository,
      actionRepository,
      gateway,
    );

    await useCase.execute({
      gameSessionId: 'game-1',
      turnNumber: 3,
    });

    expect(gateway.contexts).toHaveLength(2);
    expect(gateway.contexts[0].economicContext).toMatchObject({
      messagesDoNotMoveMoney: true,
      proposalsCanMoveMoney: true,
      acceptedProposalChangesBalances: true,
      finalizeDoesNotChangeState: true,
      unresolvedIncomingProposalCount: 1,
      unresolvedOutgoingProposalCount: 0,
    });
    expect(gateway.contexts[0].actionableProposalsForSelf).toMatchObject([
      {
        proposalActionId: 'action-1',
        proposerAgentId: 'agent-2',
        proposerName: 'Trader Bot',
        amount: '15.0000',
      },
    ]);
    expect(gateway.contexts[0].actionSemantics).toMatchObject({
      proposeDirectTransfer: expect.stringContaining(
        'concrete executable transfer proposal',
      ),
      acceptDirectTransferProposal: expect.stringContaining('change balances'),
      finalizeTurn: expect.stringContaining('does not move money'),
    });
    expect(gateway.contexts[1].economicContext).toMatchObject({
      unresolvedIncomingProposalCount: 0,
      unresolvedOutgoingProposalCount: 1,
    });
    expect(gateway.contexts[1].actionableProposalsForSelf).toHaveLength(0);
    expect(gateway.contexts[0].negotiationState).toMatchObject({
      primaryCounterpartyAgentId: 'agent-2',
      primaryCounterpartyName: 'Trader Bot',
      privateMessageExchangeCountWithPrimaryCounterparty: 2,
      unresolvedProposalExistsWithPrimaryCounterparty: true,
      conversationLikelyReadyForProposal: false,
    });
    expect(gateway.contexts[1].negotiationState).toMatchObject({
      primaryCounterpartyAgentId: 'agent-1',
      primaryCounterpartyName: 'Banker Bot',
      privateMessageExchangeCountWithPrimaryCounterparty: 2,
      unresolvedProposalExistsWithPrimaryCounterparty: true,
      conversationLikelyReadyForProposal: false,
    });
  });

  it('marks banker-trader conversation as proposal-ready when private exchange exists without an unresolved proposal', async () => {
    const messageRepository = new InMemoryAgentMessageRepository();
    await messageRepository.save({
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 1,
      senderAgentId: 'agent-1',
      recipientAgentId: 'agent-2',
      visibility: 'private',
      content: 'I can fund a strong setup.',
    });
    await messageRepository.save({
      gameSessionId: 'game-1',
      roundNumber: 1,
      turnNumber: 2,
      senderAgentId: 'agent-2',
      recipientAgentId: 'agent-1',
      visibility: 'private',
      content: 'I can work with that if the pricing is right.',
    });

    const gateway = new RecordingAgentGateway();
    const useCase = new RunAgentCommunicationTurnUseCase(
      new InMemoryGameSessionRepository(createSession()),
      messageRepository,
      new InMemoryAgentActionRepository(),
      gateway,
    );

    await useCase.execute({
      gameSessionId: 'game-1',
      turnNumber: 3,
    });

    expect(gateway.contexts[0].negotiationState).toMatchObject({
      primaryCounterpartyAgentId: 'agent-2',
      privateMessageExchangeCountWithPrimaryCounterparty: 2,
      unresolvedProposalExistsWithPrimaryCounterparty: false,
      conversationLikelyReadyForProposal: true,
    });
    expect(gateway.contexts[0].negotiationState.guidance).toContain(
      'executable transfer proposal may now be higher value',
    );
    expect(gateway.contexts[1].negotiationState).toMatchObject({
      primaryCounterpartyAgentId: 'agent-1',
      privateMessageExchangeCountWithPrimaryCounterparty: 2,
      unresolvedProposalExistsWithPrimaryCounterparty: false,
      conversationLikelyReadyForProposal: true,
    });
  });
});
