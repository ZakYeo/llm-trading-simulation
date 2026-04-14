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
    events: Array.from({ length: 12 }, (_, index) => ({
      id: `event-${index + 1}`,
      type: index === 1 ? 'message' : 'action',
      createdAt: `2026-04-14T10:${String(index).padStart(2, '0')}:00.000Z`,
      roundNumber: 2,
      turnNumber: Math.floor(index / 2) + 1,
      agentName: `Agent ${index + 1}`,
      actionType: 'finalize_turn' as const,
      senderAgentName: index === 1 ? 'Banker Bot' : undefined,
      recipientAgentName: index === 1 ? 'Trader Bot' : undefined,
      visibility: index === 1 ? 'private' : undefined,
      content:
        index === 1
          ? 'Freshly persisted private message that should stay visible.'
          : undefined,
    })),
  };
}

describe('AuditTrailCard', () => {
  it('shows all replay events by default so recent messages are not hidden behind the event window', () => {
    const html = renderToString(
      <AuditTrailCard
        replay={buildReplay()}
        selectedRound={2}
        isFetching={false}
      />,
    );

    expect(html).toContain('12<!-- --> / <!-- -->12<!-- --> events');
    expect(html).toContain(
      'Freshly persisted private message that should stay visible.',
    );
    expect(html).toContain('<option value="all" selected="">All</option>');
  });
});
