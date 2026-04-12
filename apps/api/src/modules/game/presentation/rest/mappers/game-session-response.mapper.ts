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
    };
  }
}
