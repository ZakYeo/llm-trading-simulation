import { Injectable } from '@nestjs/common';

import type { MarketOpportunity } from '../../domain/entities/market-opportunity.js';

@Injectable()
export class MarketOpportunityResolutionService {
  getResolutionReturnBps(opportunity: MarketOpportunity): number {
    return opportunity.resolutionReturnBps;
  }
}
