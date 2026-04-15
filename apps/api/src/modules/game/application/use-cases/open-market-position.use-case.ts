import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { MarketPosition } from '../../domain/entities/market-position.js';
import type { GameSessionRepositoryPort } from '../ports/game-session-repository.port.js';
import { MarketPositionEntryCostService } from '../services/market-position-entry-cost.service.js';

export interface OpenMarketPositionInput {
  gameSessionId: string;
  ownerAgentId: string;
  opportunityId: string;
  amount: string;
}

export class OpenMarketPositionUseCase {
  constructor(
    private readonly repository: GameSessionRepositoryPort,
    private readonly entryCostService = new MarketPositionEntryCostService(),
  ) {}

  async execute(input: OpenMarketPositionInput) {
    const session = await this.repository.findById(input.gameSessionId);

    if (!session) {
      throw new DomainInvariantError('Game session not found.');
    }

    const ownerAgent = session.agents.find(
      (agent) => agent.id === input.ownerAgentId,
    );
    const opportunity = session.marketOpportunities.find(
      (candidate) => candidate.id === input.opportunityId,
    );

    if (!ownerAgent) {
      throw new DomainInvariantError(
        'Market position owner must exist in the game session.',
      );
    }

    if (ownerAgent.role !== 'trader') {
      throw new DomainInvariantError(
        'Only trader agents may open market positions.',
      );
    }

    if (!opportunity) {
      throw new DomainInvariantError(
        'Market opportunity must exist in the game session.',
      );
    }

    if (opportunity.listedRound !== session.currentRound) {
      throw new DomainInvariantError(
        'Market opportunity is not open for the current round.',
      );
    }

    if (
      session.marketPositions.some(
        (position) =>
          position.opportunityId === opportunity.id &&
          position.ownerAgentId === ownerAgent.id,
      )
    ) {
      throw new DomainInvariantError(
        'Trader already has an open position for this market opportunity.',
      );
    }

    const amount = Money.fromDecimal(input.amount);
    const minCommitment = Money.fromDecimal(opportunity.minCommitment);
    const maxCommitment = Money.fromDecimal(opportunity.maxCommitment);

    if (amount.isNegative() || amount.isZero()) {
      throw new DomainInvariantError('Amount must be greater than zero.');
    }

    if (!amount.greaterThanOrEqual(minCommitment)) {
      throw new DomainInvariantError(
        'Market position amount is below the opportunity minimum commitment.',
      );
    }

    if (!maxCommitment.greaterThanOrEqual(amount)) {
      throw new DomainInvariantError(
        'Market position amount exceeds the opportunity maximum commitment.',
      );
    }

    const entryCosts = this.entryCostService.calculate({
      opportunity,
      principal: amount,
      availableBalance: ownerAgent.balance.available,
    });

    const updatedSession = session
      .withAgents(
        session.agents.map((agent) =>
          agent.id === ownerAgent.id
            ? agent.withAccounts(
                agent.balance.reserve(amount).debit(entryCosts.entryFeeAmount),
                agent.depositAccount,
              )
            : agent,
        ),
      )
      .withMarketPositions([
        ...session.marketPositions,
        new MarketPosition({
          opportunityId: opportunity.id,
          ownerAgentId: ownerAgent.id,
          opportunityTitle: opportunity.title,
          principal: amount,
          entryRound: session.currentRound,
          settlementRound: opportunity.settlementRound,
          entryFeeBps: entryCosts.entryFeeBps,
          entryFeeAmount: entryCosts.entryFeeAmount,
          entrySlippageBps: entryCosts.entrySlippageBps,
          effectiveResolutionReturnBps: entryCosts.effectiveResolutionReturnBps,
        }),
      ]);

    await this.repository.save(updatedSession, [
      {
        type: 'market_position_opened',
        gameSessionId: updatedSession.id,
        roundNumber: updatedSession.currentRound,
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        ownerAgentId: ownerAgent.id,
        amount: amount.toDecimal(),
        entryFeeBps: entryCosts.entryFeeBps,
        entryFeeAmount: entryCosts.entryFeeAmount.toDecimal(),
        entrySlippageBps: entryCosts.entrySlippageBps,
        effectiveResolutionReturnBps: entryCosts.effectiveResolutionReturnBps,
      },
    ]);

    return updatedSession;
  }
}
