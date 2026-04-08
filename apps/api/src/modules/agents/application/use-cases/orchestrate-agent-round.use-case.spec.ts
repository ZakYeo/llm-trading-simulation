import { describe, expect, it, vi } from 'vitest';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { OrchestrateAgentRoundUseCase } from './orchestrate-agent-round.use-case.js';

describe('OrchestrateAgentRoundUseCase', () => {
  it('executes the requested number of communication turns in sequence', async () => {
    const agentActionRepository = {
      findRecentByGameSessionId: vi.fn().mockResolvedValue([]),
    };
    const runAgentCommunicationTurnUseCase = {
      execute: vi
        .fn()
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 1,
          actions: [],
          actionRecords: [],
          messages: [],
        })
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          actions: [],
          actionRecords: [],
          messages: [],
        }),
    };
    const transferFundsUseCase = {
      execute: vi.fn(),
    };

    const useCase = new OrchestrateAgentRoundUseCase(
      agentActionRepository as never,
      runAgentCommunicationTurnUseCase as never,
      transferFundsUseCase as never,
    );

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        turnCount: 2,
      }),
    ).resolves.toEqual({
      gameSessionId: 'game-1',
      roundNumber: 1,
      turns: [
        {
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 1,
          actions: [],
          actionRecords: [],
          messages: [],
        },
        {
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          actions: [],
          actionRecords: [],
          messages: [],
        },
      ],
    });

    expect(runAgentCommunicationTurnUseCase.execute).toHaveBeenNthCalledWith(
      1,
      {
        gameSessionId: 'game-1',
        turnNumber: 1,
      },
    );
    expect(runAgentCommunicationTurnUseCase.execute).toHaveBeenNthCalledWith(
      2,
      {
        gameSessionId: 'game-1',
        turnNumber: 2,
      },
    );
  });

  it('rejects non-positive turn counts', async () => {
    const useCase = new OrchestrateAgentRoundUseCase(
      {
        findRecentByGameSessionId: vi.fn(),
      } as never,
      {
        execute: vi.fn(),
      } as never,
      {
        execute: vi.fn(),
      } as never,
    );

    await expect(
      useCase.execute({
        gameSessionId: 'game-1',
        turnCount: 0,
      }),
    ).rejects.toThrow(DomainInvariantError);
  });

  it('resolves accepted transfer proposals through the transfer use case', async () => {
    const agentActionRepository = {
      findRecentByGameSessionId: vi.fn().mockResolvedValue([
        {
          id: 'proposal-1',
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          agentId: 'trader-1',
          recipientAgentId: 'banker-1',
          actionType: 'propose_direct_transfer',
          amount: '12.5000',
          content: 'I need short-term capital to press a momentum setup.',
        },
        {
          id: 'accept-1',
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 3,
          agentId: 'banker-1',
          recipientAgentId: null,
          relatedProposalActionId: 'proposal-1',
          actionType: 'accept_direct_transfer_proposal',
        },
      ]),
    };
    const runAgentCommunicationTurnUseCase = {
      execute: vi
        .fn()
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 1,
          actions: [],
          actionRecords: [],
          messages: [],
        })
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          actions: [],
          actionRecords: [],
          messages: [],
        })
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 3,
          actions: [],
          actionRecords: [
            {
              id: 'accept-1',
              gameSessionId: 'game-1',
              roundNumber: 1,
              turnNumber: 3,
              agentId: 'banker-1',
              recipientAgentId: null,
              relatedProposalActionId: 'proposal-1',
              actionType: 'accept_direct_transfer_proposal',
            },
          ],
          messages: [],
        }),
    };
    const transferFundsUseCase = {
      execute: vi.fn(),
    };

    const useCase = new OrchestrateAgentRoundUseCase(
      agentActionRepository as never,
      runAgentCommunicationTurnUseCase as never,
      transferFundsUseCase as never,
    );

    await useCase.execute({
      gameSessionId: 'game-1',
      turnCount: 3,
    });

    expect(transferFundsUseCase.execute).toHaveBeenCalledWith({
      gameSessionId: 'game-1',
      sourceAgentId: 'banker-1',
      destinationAgentId: 'trader-1',
      amount: '12.5000',
    });
  });

  it('does not execute transfers for rejected proposals', async () => {
    const agentActionRepository = {
      findRecentByGameSessionId: vi.fn().mockResolvedValue([
        {
          id: 'proposal-1',
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          agentId: 'trader-1',
          recipientAgentId: 'banker-1',
          actionType: 'propose_direct_transfer',
          amount: '12.5000',
          content: 'I need short-term capital to press a momentum setup.',
        },
        {
          id: 'reject-1',
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 3,
          agentId: 'banker-1',
          recipientAgentId: null,
          relatedProposalActionId: 'proposal-1',
          actionType: 'reject_direct_transfer_proposal',
          content: 'The proposed transfer is too risky for this round.',
        },
      ]),
    };
    const runAgentCommunicationTurnUseCase = {
      execute: vi
        .fn()
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 1,
          actions: [],
          actionRecords: [],
          messages: [],
        })
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          actions: [],
          actionRecords: [],
          messages: [],
        })
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 3,
          actions: [],
          actionRecords: [
            {
              id: 'reject-1',
              gameSessionId: 'game-1',
              roundNumber: 1,
              turnNumber: 3,
              agentId: 'banker-1',
              recipientAgentId: null,
              relatedProposalActionId: 'proposal-1',
              actionType: 'reject_direct_transfer_proposal',
              content: 'The proposed transfer is too risky for this round.',
            },
          ],
          messages: [],
        }),
    };
    const transferFundsUseCase = {
      execute: vi.fn(),
    };

    const useCase = new OrchestrateAgentRoundUseCase(
      agentActionRepository as never,
      runAgentCommunicationTurnUseCase as never,
      transferFundsUseCase as never,
    );

    await useCase.execute({
      gameSessionId: 'game-1',
      turnCount: 3,
    });

    expect(transferFundsUseCase.execute).not.toHaveBeenCalled();
  });

  it('resolves accepted counter-proposals through the transfer use case', async () => {
    const agentActionRepository = {
      findRecentByGameSessionId: vi.fn().mockResolvedValue([
        {
          id: 'proposal-1',
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          agentId: 'trader-1',
          recipientAgentId: 'banker-1',
          actionType: 'propose_direct_transfer',
          amount: '12.5000',
          content: 'I need short-term capital to press a momentum setup.',
        },
        {
          id: 'counter-1',
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 3,
          agentId: 'banker-1',
          recipientAgentId: 'trader-1',
          relatedProposalActionId: 'proposal-1',
          actionType: 'counter_direct_transfer_proposal',
          amount: '8.5000',
          content: 'I can fund this round, but only at a lower amount.',
        },
        {
          id: 'accept-1',
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 4,
          agentId: 'trader-1',
          recipientAgentId: null,
          relatedProposalActionId: 'counter-1',
          actionType: 'accept_direct_transfer_proposal',
        },
      ]),
    };
    const runAgentCommunicationTurnUseCase = {
      execute: vi
        .fn()
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 1,
          actions: [],
          actionRecords: [],
          messages: [],
        })
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 2,
          actions: [],
          actionRecords: [],
          messages: [],
        })
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 3,
          actions: [],
          actionRecords: [],
          messages: [],
        })
        .mockResolvedValueOnce({
          gameSessionId: 'game-1',
          roundNumber: 1,
          turnNumber: 4,
          actions: [],
          actionRecords: [
            {
              id: 'accept-1',
              gameSessionId: 'game-1',
              roundNumber: 1,
              turnNumber: 4,
              agentId: 'trader-1',
              recipientAgentId: null,
              relatedProposalActionId: 'counter-1',
              actionType: 'accept_direct_transfer_proposal',
            },
          ],
          messages: [],
        }),
    };
    const transferFundsUseCase = {
      execute: vi.fn(),
    };

    const useCase = new OrchestrateAgentRoundUseCase(
      agentActionRepository as never,
      runAgentCommunicationTurnUseCase as never,
      transferFundsUseCase as never,
    );

    await useCase.execute({
      gameSessionId: 'game-1',
      turnCount: 4,
    });

    expect(transferFundsUseCase.execute).toHaveBeenCalledWith({
      gameSessionId: 'game-1',
      sourceAgentId: 'trader-1',
      destinationAgentId: 'banker-1',
      amount: '8.5000',
    });
  });
});
