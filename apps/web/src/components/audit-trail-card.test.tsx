import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { GameReplayRecord } from '../lib/api';

import { AuditTrailCard } from './audit-trail-card';

function buildReplay(): GameReplayRecord {
  return {
    gameSession: {
      id: 'session-1',
      name: 'Replay Session',
      status: 'active',
      currentRound: 2,
    },
    rounds: [
      {
        id: 'round-1',
        roundNumber: 2,
        createdAt: '2026-04-14T10:00:00.000Z',
      },
    ],
    events: [
      {
        id: 'event-listed-1',
        type: 'market_opportunity_listed',
        createdAt: '2026-04-14T09:59:00.000Z',
        roundNumber: 2,
        opportunityId: 'opp-1',
        opportunityTitle: 'Binary Event Volatility',
        opportunitySummary: 'Wide payoff event trade.',
        opportunityRiskLevel: 'high',
        listedRound: 2,
        settlementRound: 3,
        minCommitment: '5.0000',
        maxCommitment: '25.0000',
        worstCaseReturnBps: -300,
        bestCaseReturnBps: 420,
      },
      {
        id: 'event-resolved-1',
        type: 'market_opportunity_resolved',
        createdAt: '2026-04-14T09:59:30.000Z',
        roundNumber: 3,
        opportunityId: 'opp-1',
        opportunityTitle: 'Binary Event Volatility',
        participantCount: 1,
        totalPrincipal: '12.0000',
        totalProfitOrLoss: '3.6000',
        listedRound: 2,
        settlementRound: 3,
        participantSettlements: [
          {
            ownerAgentId: 'trader-1',
            ownerAgentName: 'Trader Bot',
            principal: '12.0000',
            profitOrLoss: '3.6000',
          },
        ],
      },
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `event-${index + 1}`,
        type: index === 1 ? ('message' as const) : ('action' as const),
        createdAt: `2026-04-14T10:${String(index).padStart(2, '0')}:00.000Z`,
        roundNumber: 2,
        turnNumber: Math.floor(index / 2) + 1,
        agentName: `Agent ${index + 1}`,
        actionType: 'finalize_turn' as const,
        senderAgentName: index === 1 ? 'Banker Bot' : undefined,
        recipientAgentName: index === 1 ? 'Trader Bot' : undefined,
        visibility: index === 1 ? ('private' as const) : undefined,
        content:
          index === 1
            ? 'Freshly persisted private message that should stay visible.'
            : undefined,
      })),
    ],
  };
}

describe('AuditTrailCard', () => {
  it('shows all replay events by default so recent messages are not hidden behind the event window', () => {
    const html = renderToString(
      <AuditTrailCard
        replay={buildReplay()}
        selectedRound={2}
        isFetching={false}
        isTurnFlowInProgress={false}
        latestRunSummary=""
      />,
    );

    expect(html).toContain('14<!-- --> / <!-- -->14<!-- --> events');
    expect(html).toContain(
      'Freshly persisted private message that should stay visible.',
    );
    expect(html).toContain('<option value="all" selected="">All</option>');
    expect(html).toContain('>market<');
    expect(html).toContain('Binary Event Volatility listed');
    expect(html).toContain('Trader Bot');
  });
});
