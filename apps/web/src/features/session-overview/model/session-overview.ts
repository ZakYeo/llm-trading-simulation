import type { AgentPersonalityProfile } from '@llm-sim/shared-types';

import type { GameSessionRecord } from '../../../lib/api';
import { formatBasisPoints, formatCurrency } from '../../../lib/formatters';

export interface BalanceAccountViewData {
  id: string;
  name: string;
  role: string;
  availableBalanceLabel: string;
  reservedBalanceLabel: string;
  personalityRows: Array<{
    label: string;
    value: string;
  }>;
}

export interface TreasuryPositionViewData {
  principalLabel: string;
  accruedInterestLabel: string;
  totalBalanceLabel: string;
}

export interface TreasuryViewData {
  totalCustodiedBalanceLabel: string;
  totalCustodiedPrincipalLabel: string;
  totalCustodiedInterestLabel: string;
  traderCustodyBalanceLabel: string;
  traderCustodyPosition?: TreasuryPositionViewData;
}

export type MarketPositionStatus = 'Open' | 'Settled';

export interface MarketOpportunityViewData {
  id: string;
  title: string;
  summary: string;
  riskLevel: 'high' | 'low';
  riskLabel: string;
  minCommitmentLabel: string;
  maxCommitmentLabel: string;
  estimatedNetReturnLabel: string;
  returnRangeLabel: string;
  signalQuality: string;
  signalQualityLabel: string;
  holdingPeriodRounds: number;
  holdingPeriodLabel: string;
  listedRound: number;
  listedRoundLabel: string;
  settlementRound: number;
  settlementRoundLabel: string;
}

export interface MarketPositionViewData {
  key: string;
  opportunityTitle: string;
  ownerName: string;
  principalLabel: string;
  entryRound: number;
  entryRoundLabel: string;
  settlementRound: number;
  settlementRoundLabel: string;
  statusLabel: MarketPositionStatus;
}

export interface FeaturedMarketPositionViewData {
  opportunityTitle: string;
  ownerName: string;
  principalLabel: string;
  settlementRound: number;
  settlementRoundLabel: string;
  statusLabel: MarketPositionStatus;
}

export interface MarketVisibilityViewData {
  currentRound: number;
  currentRoundLabel: string;
  opportunityCount: number;
  positionCount: number;
  openPositionCount: number;
  opportunityPositionSummaryLabel: string;
  opportunityTitles: string;
  opportunities: MarketOpportunityViewData[];
  positions: MarketPositionViewData[];
  featuredOpportunity?: MarketOpportunityViewData;
  featuredPosition?: FeaturedMarketPositionViewData;
  featuredOpportunitySummary: string;
  featuredPositionSummary: string;
  featuredPositionDetail: string;
}

function createPersonalityRows(
  personalityProfile?: AgentPersonalityProfile,
): BalanceAccountViewData['personalityRows'] {
  if (!personalityProfile) {
    return [];
  }

  if (personalityProfile.kind === 'banker') {
    return [
      { label: 'Warmth', value: `${personalityProfile.warmth}/10` },
      {
        label: 'Sales aggression',
        value: `${personalityProfile.salesAggression}/10`,
      },
      {
        label: 'Risk discipline',
        value: `${personalityProfile.riskDiscipline}/10`,
      },
    ];
  }

  return [
    { label: 'Assertiveness', value: `${personalityProfile.assertiveness}/10` },
    { label: 'Risk appetite', value: `${personalityProfile.riskAppetite}/10` },
    {
      label: 'Conviction threshold',
      value: `${personalityProfile.convictionThreshold}/10`,
    },
  ];
}

export function createBalanceAccounts(
  session?: GameSessionRecord,
): BalanceAccountViewData[] {
  if (!session) {
    return [];
  }

  return session.agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    availableBalanceLabel: formatCurrency(agent.availableBalance),
    reservedBalanceLabel: formatCurrency(agent.reservedBalance),
    personalityRows: createPersonalityRows(agent.personalityProfile),
  }));
}

export function createTreasuryViewData(
  session?: GameSessionRecord,
): TreasuryViewData | undefined {
  if (!session) {
    return undefined;
  }

  const banker = session.agents.find((agent) => agent.role === 'banker');
  const trader = session.agents.find((agent) => agent.role === 'trader');
  const traderCustodyPosition =
    banker && trader
      ? session.bankerCustodyPositions.find(
          (position) =>
            position.bankerAgentId === banker.id &&
            position.ownerAgentId === trader.id,
        )
      : undefined;
  const totalCustodiedBalance = session.bankerCustodyPositions.reduce(
    (total, position) => total + Number.parseFloat(position.totalBalance),
    0,
  );
  const totalCustodiedInterest = session.bankerCustodyPositions.reduce(
    (total, position) => total + Number.parseFloat(position.accruedInterest),
    0,
  );
  const totalCustodiedPrincipal = session.bankerCustodyPositions.reduce(
    (total, position) => total + Number.parseFloat(position.principal),
    0,
  );

  return {
    totalCustodiedBalanceLabel: formatCurrency(
      totalCustodiedBalance.toFixed(4),
    ),
    totalCustodiedPrincipalLabel: formatCurrency(
      totalCustodiedPrincipal.toFixed(4),
    ),
    totalCustodiedInterestLabel: formatCurrency(
      totalCustodiedInterest.toFixed(4),
    ),
    traderCustodyBalanceLabel: formatCurrency(
      traderCustodyPosition?.totalBalance ?? '0.0000',
    ),
    traderCustodyPosition: traderCustodyPosition
      ? {
          principalLabel: formatCurrency(traderCustodyPosition.principal),
          accruedInterestLabel: formatCurrency(
            traderCustodyPosition.accruedInterest,
          ),
          totalBalanceLabel: formatCurrency(traderCustodyPosition.totalBalance),
        }
      : undefined,
  };
}

export function getPositionStatusLabel(
  currentRound: number,
  settlementRound: number,
): MarketPositionStatus {
  return settlementRound <= currentRound ? 'Settled' : 'Open';
}

export function createMarketVisibilityViewData(
  session?: GameSessionRecord,
): MarketVisibilityViewData | undefined {
  if (!session) {
    return undefined;
  }

  const opportunities = session.marketOpportunities.map((opportunity) => ({
    id: opportunity.id,
    title: opportunity.title,
    summary: opportunity.summary,
    riskLevel: opportunity.riskLevel,
    riskLabel: opportunity.riskLevel === 'high' ? 'High risk' : 'Low risk',
    minCommitmentLabel: formatCurrency(opportunity.minCommitment),
    maxCommitmentLabel: formatCurrency(opportunity.maxCommitment),
    estimatedNetReturnLabel: formatBasisPoints(
      opportunity.estimatedNetReturnBps,
    ),
    returnRangeLabel: `${formatBasisPoints(opportunity.worstCaseReturnBps)} to ${formatBasisPoints(opportunity.bestCaseReturnBps)}`,
    signalQuality: opportunity.signalQuality,
    signalQualityLabel: `${opportunity.signalQuality} signal`,
    holdingPeriodRounds: opportunity.holdingPeriodRounds,
    holdingPeriodLabel: `${opportunity.holdingPeriodRounds} round${
      opportunity.holdingPeriodRounds === 1 ? '' : 's'
    }`,
    listedRound: opportunity.listedRound,
    listedRoundLabel: `Round ${opportunity.listedRound}`,
    settlementRound: opportunity.settlementRound,
    settlementRoundLabel: `Round ${opportunity.settlementRound}`,
  }));
  const positions = session.marketPositions.map((position) => {
    const ownerAgent = session.agents.find(
      (agent) => agent.id === position.ownerAgentId,
    );

    return {
      key: `${position.ownerAgentId}-${position.opportunityId}-${position.entryRound}`,
      opportunityTitle: position.opportunityTitle,
      ownerName: ownerAgent?.name ?? position.ownerAgentId,
      principalLabel: formatCurrency(position.principal),
      entryRound: position.entryRound,
      entryRoundLabel: `Round ${position.entryRound}`,
      settlementRound: position.settlementRound,
      settlementRoundLabel: `Round ${position.settlementRound}`,
      statusLabel: getPositionStatusLabel(
        session.currentRound,
        position.settlementRound,
      ),
    };
  });
  const openPositions = positions.filter(
    (position) => position.statusLabel === 'Open',
  );
  const settledPositions = positions.filter(
    (position) => position.statusLabel === 'Settled',
  );
  const featuredPosition = openPositions[0] ?? settledPositions[0];

  return {
    currentRound: session.currentRound,
    currentRoundLabel: `Round ${session.currentRound}`,
    opportunityCount: opportunities.length,
    positionCount: positions.length,
    openPositionCount: openPositions.length,
    opportunityPositionSummaryLabel: `${opportunities.length} opportunit${
      opportunities.length === 1 ? 'y' : 'ies'
    } / ${positions.length} position${positions.length === 1 ? '' : 's'}`,
    opportunityTitles: opportunities
      .map((opportunity) => opportunity.title)
      .join(' · '),
    opportunities,
    positions,
    featuredOpportunity: opportunities[0],
    featuredPosition: featuredPosition
      ? {
          opportunityTitle: featuredPosition.opportunityTitle,
          ownerName: featuredPosition.ownerName,
          principalLabel: featuredPosition.principalLabel,
          settlementRound: featuredPosition.settlementRound,
          settlementRoundLabel: featuredPosition.settlementRoundLabel,
          statusLabel: featuredPosition.statusLabel,
        }
      : undefined,
    featuredOpportunitySummary: opportunities[0]
      ? `${opportunities[0].minCommitmentLabel} to ${opportunities[0].maxCommitmentLabel} · ${opportunities[0].estimatedNetReturnLabel} · ${opportunities[0].signalQualityLabel} · ${opportunities[0].holdingPeriodRounds} round hold`
      : 'No live market opportunities are available in this session.',
    featuredPositionSummary: featuredPosition
      ? `${featuredPosition.opportunityTitle} · ${featuredPosition.principalLabel}`
      : 'No market positions opened yet.',
    featuredPositionDetail: featuredPosition
      ? `${featuredPosition.ownerName} · ${featuredPosition.statusLabel} · ${featuredPosition.settlementRoundLabel}`
      : 'Exposure appears here once a trader opens a position.',
  };
}
