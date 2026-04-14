import type {
  MarketOpportunityCategory,
  MarketOpportunityRiskLevel,
} from '../../domain/entities/market-opportunity.js';

export interface MarketOpportunityTemplate {
  id: string;
  category: MarketOpportunityCategory;
  riskLevel: MarketOpportunityRiskLevel;
  title: string;
  summary: string;
  minCommitment: string;
  maxCommitment: string;
  estimatedNetReturnBps: number;
  worstCaseReturnBps: number;
  bestCaseReturnBps: number;
  settlementHorizons: [1] | [1, 2];
  resolutionReturnBpsOptions: readonly [number, ...number[]];
  isExtremeRisk?: boolean;
}

export const marketOpportunityTemplateCatalog: readonly MarketOpportunityTemplate[] =
  [
    {
      id: 'carry-stable-01',
      category: 'carry',
      riskLevel: 'low',
      title: 'Steep Curve Carry',
      summary:
        'A measured carry trade with predictable financing and capped upside. Reliable if unexciting.',
      minCommitment: '5.0000',
      maxCommitment: '18.0000',
      estimatedNetReturnBps: 85,
      worstCaseReturnBps: -60,
      bestCaseReturnBps: 160,
      settlementHorizons: [1],
      resolutionReturnBpsOptions: [120, 90, 45, -40],
    },
    {
      id: 'carry-trap-01',
      category: 'carry',
      riskLevel: 'low',
      title: 'Funding Basis Trap',
      summary:
        'The headline carry looks calm, but rolling costs and crowded positioning can turn it into slow bleed.',
      minCommitment: '5.0000',
      maxCommitment: '20.0000',
      estimatedNetReturnBps: -55,
      worstCaseReturnBps: -180,
      bestCaseReturnBps: 35,
      settlementHorizons: [1],
      resolutionReturnBpsOptions: [-150, -90, -45, 20],
    },
    {
      id: 'event-binary-01',
      category: 'event',
      riskLevel: 'high',
      title: 'Binary Event Volatility',
      summary:
        'A one-round catalyst trade with asymmetric upside and sharp downside if the event breaks the wrong way.',
      minCommitment: '5.0000',
      maxCommitment: '26.0000',
      estimatedNetReturnBps: 260,
      worstCaseReturnBps: -850,
      bestCaseReturnBps: 1250,
      settlementHorizons: [1],
      resolutionReturnBpsOptions: [1250, 680, -420, -850],
      isExtremeRisk: true,
    },
    {
      id: 'trend-breakout-01',
      category: 'trend',
      riskLevel: 'high',
      title: 'Momentum Breakout Chase',
      summary:
        'Price action is accelerating. The move can extend quickly, but late entries get punished hard on reversal.',
      minCommitment: '6.0000',
      maxCommitment: '24.0000',
      estimatedNetReturnBps: 180,
      worstCaseReturnBps: -420,
      bestCaseReturnBps: 620,
      settlementHorizons: [1, 2],
      resolutionReturnBpsOptions: [540, 260, -180, -360],
    },
    {
      id: 'arbitrage-tight-01',
      category: 'arbitrage',
      riskLevel: 'low',
      title: 'Tight Basis Arbitrage',
      summary:
        'A modest pricing dislocation with decent execution confidence and limited but positive edge.',
      minCommitment: '4.0000',
      maxCommitment: '16.0000',
      estimatedNetReturnBps: 95,
      worstCaseReturnBps: -35,
      bestCaseReturnBps: 180,
      settlementHorizons: [1],
      resolutionReturnBpsOptions: [140, 100, 65, -20],
    },
    {
      id: 'liquidity-crunch-01',
      category: 'liquidity_stress',
      riskLevel: 'high',
      title: 'Liquidity Vacuum Repricing',
      summary:
        'A stressed tape can overshoot violently. Good timing pays, but exits get ugly when liquidity disappears.',
      minCommitment: '7.0000',
      maxCommitment: '28.0000',
      estimatedNetReturnBps: 240,
      worstCaseReturnBps: -900,
      bestCaseReturnBps: 1100,
      settlementHorizons: [1, 2],
      resolutionReturnBpsOptions: [980, 520, -380, -900],
      isExtremeRisk: true,
    },
    {
      id: 'special-situation-01',
      category: 'special_situation',
      riskLevel: 'high',
      title: 'Forced Seller Stub',
      summary:
        'A special situation with potential mispricing and messy path dependence. Position sizing matters.',
      minCommitment: '6.0000',
      maxCommitment: '30.0000',
      estimatedNetReturnBps: 170,
      worstCaseReturnBps: -520,
      bestCaseReturnBps: 760,
      settlementHorizons: [1, 2],
      resolutionReturnBpsOptions: [740, 310, -220, -480],
    },
    {
      id: 'mean-reversion-01',
      category: 'trend',
      riskLevel: 'low',
      title: 'Overextension Mean Revert',
      summary:
        'The move looks stretched and a snapback is plausible. Balanced edge with softer tails than directional momentum.',
      minCommitment: '5.0000',
      maxCommitment: '18.0000',
      estimatedNetReturnBps: 110,
      worstCaseReturnBps: -120,
      bestCaseReturnBps: 260,
      settlementHorizons: [1, 2],
      resolutionReturnBpsOptions: [220, 130, 40, -90],
    },
  ] as const;
