import type {
  AgentActionType,
  GameReplayRecord,
  GameSessionRecord,
  GameSessionSummary,
  OrchestratedRoundRecord,
  ReplayEventRecord,
} from '@llm-sim/shared-types';

const bankerAgentId = 'banker-1';
const traderAgentId = 'trader-1';
const sessionId = 'session-e2e-1';
const createdAt = '2026-04-14T09:00:00.000Z';

function buildReplayEvent(event: ReplayEventRecord): ReplayEventRecord {
  return {
    createdAt,
    ...event,
  };
}

export function buildBankerTraderSessionSummary(
  overrides: Partial<GameSessionSummary> = {},
): GameSessionSummary {
  return {
    id: sessionId,
    name: 'Deterministic Session',
    status: 'active',
    currentRound: 0,
    ...overrides,
  };
}

export function buildBankerTraderSession(
  overrides: Partial<GameSessionRecord> = {},
): GameSessionRecord {
  const summary = buildBankerTraderSessionSummary(overrides);

  return {
    ...summary,
    agents: [
      {
        id: bankerAgentId,
        name: 'Banker Bot',
        role: 'banker',
        availableBalance: '100.0000',
        reservedBalance: '0.0000',
      },
      {
        id: traderAgentId,
        name: 'Trader Bot',
        role: 'trader',
        availableBalance: '100.0000',
        reservedBalance: '0.0000',
      },
    ],
    bankerCustodyPositions: [],
    marketOpportunities: [
      {
        id: 'opp-carry-1',
        templateId: 'carry-stable-01',
        category: 'carry',
        title: 'Carry Ladder',
        summary: 'Stable funding spread with capped upside.',
        riskLevel: 'low',
        listedRound: summary.currentRound,
        settlementRound: summary.currentRound + 1,
        minCommitment: '5.0000',
        maxCommitment: '25.0000',
        estimatedNetReturnBps: 60,
        worstCaseReturnBps: -20,
        bestCaseReturnBps: 120,
      },
      {
        id: 'opp-event-1',
        templateId: 'event-binary-01',
        category: 'event',
        title: 'Binary Event Volatility',
        summary: 'High-conviction event risk with wide payoff tails.',
        riskLevel: 'high',
        listedRound: summary.currentRound,
        settlementRound: summary.currentRound + 1,
        minCommitment: '10.0000',
        maxCommitment: '40.0000',
        estimatedNetReturnBps: 180,
        worstCaseReturnBps: -300,
        bestCaseReturnBps: 420,
      },
    ],
    marketPositions: [],
    ...overrides,
  };
}

export function buildReplayRecord(
  session: GameSessionRecord,
  events: ReplayEventRecord[] = [],
): GameReplayRecord {
  return {
    gameSession: {
      id: session.id,
      name: session.name,
      status: session.status,
      currentRound: session.currentRound,
    },
    rounds: [
      {
        id: `round-${session.currentRound}`,
        roundNumber: session.currentRound,
        createdAt,
      },
    ],
    events,
  };
}

export function buildActionEvent(input: {
  id: string;
  actionType: AgentActionType;
  amount?: string;
  roundNumber?: number;
  turnNumber?: number;
}) {
  return buildReplayEvent({
    id: input.id,
    type: 'action',
    agentId: traderAgentId,
    agentName: 'Trader Bot',
    actionType: input.actionType,
    amount: input.amount,
    roundNumber: input.roundNumber ?? 0,
    turnNumber: input.turnNumber ?? 1,
  });
}

export function buildOpenMarketPositionEvent(input: {
  id: string;
  amount: string;
  opportunityId?: string;
  opportunityTitle?: string;
  roundNumber?: number;
}) {
  return buildReplayEvent({
    id: input.id,
    type: 'market_position_opened',
    ownerAgentId: traderAgentId,
    ownerAgentName: 'Trader Bot',
    opportunityId: input.opportunityId ?? 'opp-event-1',
    opportunityTitle: input.opportunityTitle ?? 'Binary Event Volatility',
    amount: input.amount,
    roundNumber: input.roundNumber ?? 0,
  });
}

export function buildCustodyPlacementEvent(input: {
  id: string;
  amount: string;
  roundNumber?: number;
}) {
  return buildReplayEvent({
    id: input.id,
    type: 'custody_placement',
    ownerAgentId: traderAgentId,
    ownerAgentName: 'Trader Bot',
    bankerAgentId,
    bankerAgentName: 'Banker Bot',
    amount: input.amount,
    roundNumber: input.roundNumber ?? 0,
  });
}

export function buildCustodyAccrualEvent(input: {
  id: string;
  amount: string;
  roundNumber?: number;
}) {
  return buildReplayEvent({
    id: input.id,
    type: 'custody_accrual',
    ownerAgentId: traderAgentId,
    ownerAgentName: 'Trader Bot',
    bankerAgentId,
    bankerAgentName: 'Banker Bot',
    amount: input.amount,
    roundNumber: input.roundNumber ?? 1,
  });
}

export function buildMarketSettlementEvent(input: {
  id: string;
  profitOrLoss: string;
  opportunityId?: string;
  opportunityTitle?: string;
  roundNumber?: number;
}) {
  return buildReplayEvent({
    id: input.id,
    type: 'market_position_settled',
    ownerAgentId: traderAgentId,
    ownerAgentName: 'Trader Bot',
    opportunityId: input.opportunityId ?? 'opp-event-1',
    opportunityTitle: input.opportunityTitle ?? 'Binary Event Volatility',
    profitOrLoss: input.profitOrLoss,
    roundNumber: input.roundNumber ?? 1,
  });
}

export interface MockApiState {
  sessions?: GameSessionSummary[];
  session: GameSessionRecord;
  replay: GameReplayRecord;
}

export function buildStaticMarketState(): MockApiState {
  const session = buildBankerTraderSession();

  return {
    sessions: [buildBankerTraderSessionSummary()],
    session,
    replay: buildReplayRecord(session, []),
  };
}

export function buildCustodyPlacedState(): MockApiState {
  const session = buildBankerTraderSession({
    bankerCustodyPositions: [
      {
        bankerAgentId,
        ownerAgentId: traderAgentId,
        principal: '10.0000',
        accruedInterest: '0.0000',
        totalBalance: '10.0000',
      },
    ],
    agents: [
      {
        id: bankerAgentId,
        name: 'Banker Bot',
        role: 'banker',
        availableBalance: '110.0000',
        reservedBalance: '0.0000',
      },
      {
        id: traderAgentId,
        name: 'Trader Bot',
        role: 'trader',
        availableBalance: '90.0000',
        reservedBalance: '0.0000',
      },
    ],
  });

  return {
    sessions: [buildBankerTraderSessionSummary()],
    session,
    replay: buildReplayRecord(session, [
      buildActionEvent({
        id: 'event-action-custody-place',
        actionType: 'place_funds_with_banker',
        amount: '10.0000',
      }),
      buildCustodyPlacementEvent({
        id: 'event-custody-place',
        amount: '10.0000',
      }),
    ]),
  };
}

export function buildOpenMarketPositionTransition() {
  const initial = buildStaticMarketState();
  const nextSession = buildBankerTraderSession({
    agents: [
      {
        id: bankerAgentId,
        name: 'Banker Bot',
        role: 'banker',
        availableBalance: '100.0000',
        reservedBalance: '0.0000',
      },
      {
        id: traderAgentId,
        name: 'Trader Bot',
        role: 'trader',
        availableBalance: '80.0000',
        reservedBalance: '20.0000',
      },
    ],
    marketPositions: [
      {
        opportunityId: 'opp-event-1',
        ownerAgentId: traderAgentId,
        opportunityTitle: 'Binary Event Volatility',
        principal: '20.0000',
        entryRound: 0,
        settlementRound: 1,
      },
    ],
  });
  const nextState: MockApiState = {
    sessions: [buildBankerTraderSessionSummary()],
    session: nextSession,
    replay: buildReplayRecord(nextSession, [
      buildActionEvent({
        id: 'event-action-market-open',
        actionType: 'open_market_position',
        amount: '20.0000',
      }),
      buildOpenMarketPositionEvent({
        id: 'event-market-open',
        amount: '20.0000',
      }),
    ]),
  };
  const orchestratedRound: OrchestratedRoundRecord = {
    gameSessionId: nextSession.id,
    roundNumber: 0,
    turns: [
      {
        gameSessionId: nextSession.id,
        roundNumber: 0,
        turnNumber: 1,
        actions: [
          {
            agentId: traderAgentId,
            agentName: 'Trader Bot',
            action: {
              type: 'open_market_position',
            },
          },
        ],
        actionRecords: [
          {
            id: 'action-open-market-position',
            actionType: 'open_market_position',
            amount: '20.0000',
          },
        ],
        messages: [],
      },
    ],
  };

  return { initial, nextState, orchestratedRound };
}

export function buildCustodyAccrualTransition() {
  const initial = buildCustodyPlacedState();
  const nextSession = buildBankerTraderSession({
    currentRound: 1,
    agents: [
      {
        id: bankerAgentId,
        name: 'Banker Bot',
        role: 'banker',
        availableBalance: '110.2500',
        reservedBalance: '0.0000',
      },
      {
        id: traderAgentId,
        name: 'Trader Bot',
        role: 'trader',
        availableBalance: '90.0000',
        reservedBalance: '0.0000',
      },
    ],
    bankerCustodyPositions: [
      {
        bankerAgentId,
        ownerAgentId: traderAgentId,
        principal: '10.0000',
        accruedInterest: '0.2500',
        totalBalance: '10.2500',
      },
    ],
  });
  const nextState: MockApiState = {
    sessions: [
      buildBankerTraderSessionSummary({
        currentRound: 1,
      }),
    ],
    session: nextSession,
    replay: buildReplayRecord(nextSession, [
      buildActionEvent({
        id: 'event-action-custody-place',
        actionType: 'place_funds_with_banker',
        amount: '10.0000',
      }),
      buildCustodyPlacementEvent({
        id: 'event-custody-place',
        amount: '10.0000',
      }),
      buildCustodyAccrualEvent({
        id: 'event-custody-accrual',
        amount: '0.2500',
      }),
    ]),
  };

  return { initial, nextState };
}

export function buildMarketSettlementTransition() {
  const marketOpen = buildOpenMarketPositionTransition();
  const initialSession = buildBankerTraderSession({
    marketPositions: marketOpen.nextState.session.marketPositions,
    agents: marketOpen.nextState.session.agents,
  });
  const initial: MockApiState = {
    sessions: [buildBankerTraderSessionSummary()],
    session: initialSession,
    replay: buildReplayRecord(initialSession, [
      buildActionEvent({
        id: 'event-action-market-open',
        actionType: 'open_market_position',
        amount: '20.0000',
      }),
      buildOpenMarketPositionEvent({
        id: 'event-market-open',
        amount: '20.0000',
      }),
    ]),
  };
  const nextSession = buildBankerTraderSession({
    currentRound: 1,
    agents: [
      {
        id: bankerAgentId,
        name: 'Banker Bot',
        role: 'banker',
        availableBalance: '100.0000',
        reservedBalance: '0.0000',
      },
      {
        id: traderAgentId,
        name: 'Trader Bot',
        role: 'trader',
        availableBalance: '123.0000',
        reservedBalance: '0.0000',
      },
    ],
    marketPositions: [
      {
        opportunityId: 'opp-event-1',
        ownerAgentId: traderAgentId,
        opportunityTitle: 'Binary Event Volatility',
        principal: '20.0000',
        entryRound: 0,
        settlementRound: 1,
      },
    ],
  });
  const nextState: MockApiState = {
    sessions: [
      buildBankerTraderSessionSummary({
        currentRound: 1,
      }),
    ],
    session: nextSession,
    replay: buildReplayRecord(nextSession, [
      buildActionEvent({
        id: 'event-action-market-open',
        actionType: 'open_market_position',
        amount: '20.0000',
      }),
      buildOpenMarketPositionEvent({
        id: 'event-market-open',
        amount: '20.0000',
      }),
      buildMarketSettlementEvent({
        id: 'event-market-settlement',
        profitOrLoss: '3.0000',
      }),
    ]),
  };

  return { initial, nextState };
}
