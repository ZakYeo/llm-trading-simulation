import type { GameSessionRecord } from '@llm-sim/shared-types';

import type { GameSession } from '../../../domain/entities/game-session.js';

export class GameSessionResponseMapper {
  static toResponse(session: GameSession): GameSessionRecord {
    return {
      id: session.id,
      name: session.name,
      status: session.status,
      currentRound: session.currentRound,
      agents: session.agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        availableBalance: agent.balance.available.toDecimal(),
        reservedBalance: agent.balance.reserved.toDecimal(),
        personalityProfile: agent.personalityProfile ?? undefined,
      })),
      bankerCustodyPositions: session.bankerCustodyPositions.map(
        (position) => ({
          bankerAgentId: position.bankerAgentId,
          ownerAgentId: position.ownerAgentId,
          principal: position.principal.toDecimal(),
          accruedInterest: position.accruedInterest.toDecimal(),
          totalBalance: position.totalBalance().toDecimal(),
        }),
      ),
      marketOpportunities: session.marketOpportunities.map((opportunity) => ({
        id: opportunity.id,
        templateId: opportunity.templateId,
        category: opportunity.category,
        title: opportunity.title,
        summary: opportunity.summary,
        riskLevel: opportunity.riskLevel,
        listedRound: opportunity.listedRound,
        settlementRound: opportunity.settlementRound,
        minCommitment: opportunity.minCommitment,
        maxCommitment: opportunity.maxCommitment,
        estimatedNetReturnBps: opportunity.estimatedNetReturnBps,
        worstCaseReturnBps: opportunity.worstCaseReturnBps,
        bestCaseReturnBps: opportunity.bestCaseReturnBps,
        signalQuality: opportunity.signalQuality,
        holdingPeriodRounds: opportunity.holdingPeriodRounds,
      })),
      marketPositions: session.marketPositions.map((position) => ({
        opportunityId: position.opportunityId,
        ownerAgentId: position.ownerAgentId,
        opportunityTitle: position.opportunityTitle,
        principal: position.principal.toDecimal(),
        entryRound: position.entryRound,
        settlementRound: position.settlementRound,
      })),
    };
  }
}
