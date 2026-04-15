import { describe, expect, it } from 'vitest';

import { MarketOpportunity } from '../../domain/entities/market-opportunity.js';
import { MarketOpportunityBoardFactory } from './market-opportunity-board.factory.js';
import { marketOpportunityTemplateCatalog } from './market-opportunity-template.catalog.js';

describe('MarketOpportunityBoardFactory', () => {
  it('exposes the expected template catalog mix', () => {
    expect(marketOpportunityTemplateCatalog).toHaveLength(8);
    expect(
      new Set(marketOpportunityTemplateCatalog.map((template) => template.id))
        .size,
    ).toBe(8);
    expect(
      new Set(
        marketOpportunityTemplateCatalog.map((template) => template.category),
      ),
    ).toEqual(
      new Set([
        'carry',
        'event',
        'trend',
        'arbitrage',
        'liquidity_stress',
        'special_situation',
      ]),
    );
  });

  it('creates a deterministic initial board with low and high risk coverage', () => {
    const factory = new MarketOpportunityBoardFactory();

    const left = factory.createInitialBoard('game-1', 0);
    const right = factory.createInitialBoard('game-1', 0);

    expect(left).toHaveLength(2);
    expect(left.map((opportunity) => opportunity.id)).toEqual(
      right.map((opportunity) => opportunity.id),
    );
    expect(left.some((opportunity) => opportunity.riskLevel === 'low')).toBe(
      true,
    );
    expect(left.some((opportunity) => opportunity.riskLevel === 'high')).toBe(
      true,
    );
    expect(
      left.every((opportunity) => opportunity.estimatedNetReturnBps > 0),
    ).toBe(true);
    expect(
      left.every(
        (opportunity) =>
          opportunity.signalQuality === 'low' ||
          opportunity.signalQuality === 'medium' ||
          opportunity.signalQuality === 'high',
      ),
    ).toBe(true);
  });

  it('tops the board back up deterministically after round advancement without exceeding four active opportunities', () => {
    const factory = new MarketOpportunityBoardFactory();
    const carriedOpportunity = new MarketOpportunity({
      id: 'game-1-liquidity-crunch-01-r0-n1',
      templateId: 'liquidity-crunch-01',
      category: 'liquidity_stress',
      title: 'Liquidity Vacuum Repricing',
      summary: 'Stress is still propagating through the tape.',
      riskLevel: 'high',
      listedRound: 0,
      settlementRound: 2,
      minCommitment: '7.0000',
      maxCommitment: '28.0000',
      estimatedNetReturnBps: 240,
      worstCaseReturnBps: -900,
      bestCaseReturnBps: 1100,
      resolutionReturnBps: 520,
    });

    const additions = factory.createRoundAdvanceAdditions('game-1', 1, [
      carriedOpportunity,
    ]);
    const repeatAdditions = factory.createRoundAdvanceAdditions('game-1', 1, [
      carriedOpportunity,
    ]);

    expect(additions.length).toBeGreaterThanOrEqual(1);
    expect(additions.length).toBeLessThanOrEqual(3);
    expect(
      additions.every((opportunity) => opportunity.listedRound === 1),
    ).toBe(true);
    expect(
      additions.every((opportunity) => opportunity.id.includes('-r1-')),
    ).toBe(true);
    expect(additions.map((opportunity) => opportunity.id)).toEqual(
      repeatAdditions.map((opportunity) => opportunity.id),
    );
    expect(
      new Set(
        [carriedOpportunity, ...additions].map(
          (opportunity) => opportunity.templateId,
        ),
      ).size,
    ).toBe([carriedOpportunity, ...additions].length);
    expect([carriedOpportunity, ...additions]).toHaveLength(
      1 + additions.length,
    );
    expect(1 + additions.length).toBeLessThanOrEqual(4);
  });
});
