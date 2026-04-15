import type { Money } from '../../../shared/domain/value-objects/money.js';
import type { MarketOpportunity } from '../../domain/entities/market-opportunity.js';

export interface MarketPositionEntryCostInput {
  opportunity: MarketOpportunity;
  principal: Money;
  availableBalance: Money;
}

export interface MarketPositionEntryCostResult {
  entryFeeBps: number;
  entryFeeAmount: Money;
  entrySlippageBps: number;
  effectiveResolutionReturnBps: number;
}

export const DEFAULT_MARKET_POSITION_ENTRY_FEE_BPS = 20;

export class MarketPositionEntryCostService {
  constructor(
    private readonly entryFeeBps = DEFAULT_MARKET_POSITION_ENTRY_FEE_BPS,
  ) {}

  calculate(
    input: MarketPositionEntryCostInput,
  ): MarketPositionEntryCostResult {
    const entryFeeAmount = input.principal.multiplyBps(this.entryFeeBps);
    const entrySlippageBps = this.calculateEntrySlippageBps(input);

    return {
      entryFeeBps: this.entryFeeBps,
      entryFeeAmount,
      entrySlippageBps,
      effectiveResolutionReturnBps:
        input.opportunity.resolutionReturnBps - entrySlippageBps,
    };
  }

  private calculateEntrySlippageBps(
    input: MarketPositionEntryCostInput,
  ): number {
    const riskComponent = input.opportunity.riskLevel === 'high' ? 18 : 6;
    const signalComponent =
      input.opportunity.signalQuality === 'low'
        ? 12
        : input.opportunity.signalQuality === 'medium'
          ? 6
          : 0;
    const sizeComponent = this.calculateSizeComponent(input);

    return riskComponent + signalComponent + sizeComponent;
  }

  private calculateSizeComponent(input: MarketPositionEntryCostInput): number {
    const maxCommitment = Number.parseFloat(input.opportunity.maxCommitment);
    const principal = Number.parseFloat(input.principal.toDecimal());
    const availableBalance = Number.parseFloat(
      input.availableBalance.toDecimal(),
    );
    const shareOfOpportunityCap =
      maxCommitment > 0 ? principal / maxCommitment : 1;
    const shareOfLiquidBalance =
      availableBalance > 0 ? principal / availableBalance : 1;
    const pressure = Math.max(shareOfOpportunityCap, shareOfLiquidBalance);

    if (pressure >= 0.9) {
      return 18;
    }

    if (pressure >= 0.75) {
      return 12;
    }

    if (pressure >= 0.5) {
      return 6;
    }

    return 0;
  }
}
