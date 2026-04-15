import { describe, expect, it } from 'vitest';

import { Money } from '../../../shared/domain/value-objects/money.js';
import type { MarketOpportunity } from '../../domain/entities/market-opportunity.js';
import { MarketPositionEntryCostService } from './market-position-entry-cost.service.js';

function createOpportunity(overrides: Partial<MarketOpportunity> = {}) {
  return {
    id: overrides.id ?? 'opp-1',
    templateId: overrides.templateId ?? 'carry-stable-01',
    category: overrides.category ?? 'carry',
    title: overrides.title ?? 'Steep Curve Carry',
    summary: overrides.summary ?? 'Carry setup.',
    riskLevel: overrides.riskLevel ?? 'low',
    listedRound: overrides.listedRound ?? 0,
    settlementRound: overrides.settlementRound ?? 1,
    minCommitment: overrides.minCommitment ?? '5.0000',
    maxCommitment: overrides.maxCommitment ?? '20.0000',
    estimatedNetReturnBps: overrides.estimatedNetReturnBps ?? 85,
    worstCaseReturnBps: overrides.worstCaseReturnBps ?? -60,
    bestCaseReturnBps: overrides.bestCaseReturnBps ?? 160,
    resolutionReturnBps: overrides.resolutionReturnBps ?? 120,
    signalQuality: overrides.signalQuality ?? 'high',
    holdingPeriodRounds: overrides.holdingPeriodRounds ?? 1,
  } as MarketOpportunity;
}

describe('MarketPositionEntryCostService', () => {
  it('calculates a proportional entry fee', () => {
    const service = new MarketPositionEntryCostService();

    const result = service.calculate({
      opportunity: createOpportunity(),
      principal: Money.fromDecimal('12.0000'),
      availableBalance: Money.fromDecimal('100.0000'),
    });

    expect(result.entryFeeBps).toBe(20);
    expect(result.entryFeeAmount.toDecimal()).toBe('0.0240');
  });

  it('increases slippage for higher-risk, weaker-signal, and larger trades', () => {
    const service = new MarketPositionEntryCostService();

    const lowPressure = service.calculate({
      opportunity: createOpportunity({
        riskLevel: 'low',
        signalQuality: 'high',
        resolutionReturnBps: 120,
      }),
      principal: Money.fromDecimal('5.0000'),
      availableBalance: Money.fromDecimal('100.0000'),
    });
    const highPressure = service.calculate({
      opportunity: createOpportunity({
        riskLevel: 'high',
        signalQuality: 'low',
        maxCommitment: '25.0000',
        resolutionReturnBps: 1200,
      }),
      principal: Money.fromDecimal('22.5000'),
      availableBalance: Money.fromDecimal('25.0000'),
    });

    expect(highPressure.entrySlippageBps).toBeGreaterThan(
      lowPressure.entrySlippageBps,
    );
    expect(highPressure.effectiveResolutionReturnBps).toBe(
      1200 - highPressure.entrySlippageBps,
    );
  });

  it('is deterministic for identical inputs', () => {
    const service = new MarketPositionEntryCostService();
    const input = {
      opportunity: createOpportunity({
        riskLevel: 'high',
        signalQuality: 'medium',
        maxCommitment: '25.0000',
        resolutionReturnBps: 680,
      }),
      principal: Money.fromDecimal('10.0000'),
      availableBalance: Money.fromDecimal('100.0000'),
    };

    expect(service.calculate(input)).toEqual(service.calculate(input));
  });
});
