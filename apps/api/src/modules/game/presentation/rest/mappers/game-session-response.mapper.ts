import type { GameSession } from '../../../domain/entities/game-session.js';

export class GameSessionResponseMapper {
  static toResponse(session: GameSession) {
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
        depositPrincipal: agent.depositAccount.principal.toDecimal(),
        depositAccruedInterest:
          agent.depositAccount.accruedInterest.toDecimal(),
      })),
    };
  }
}
