import type { AgentPersonalityProfile } from '@llm-sim/shared-types';

import type { GameSessionRecord } from '../../../lib/api';

export interface BalanceAccountViewData {
  id: string;
  name: string;
  role: string;
  availableBalance: string;
  reservedBalance: string;
  personalityProfile?: AgentPersonalityProfile;
}

export interface TreasuryPositionViewData {
  principal: string;
  accruedInterest: string;
  totalBalance: string;
}

export interface TreasuryViewData {
  totalCustodiedBalance: string;
  totalCustodiedPrincipal: string;
  totalCustodiedInterest: string;
  traderCustodyBalance: string;
  traderCustodyPosition?: TreasuryPositionViewData;
}

export type MarketPositionStatus = 'Open' | 'Settled';

export interface MarketOpportunityViewData {
  id: string;
  title: string;
  summary: string;
  riskLevel: 'high' | 'low';
  minCommitment: string;
  maxCommitment: string;
  estimatedNetReturnBps: number;
  worstCaseReturnBps: number;
  bestCaseReturnBps: number;
  signalQuality: string;
  holdingPeriodRounds: number;
  listedRound: number;
  settlementRound: number;
}

export interface MarketPositionViewData {
  key: string;
  opportunityTitle: string;
  ownerName: string;
  principal: string;
  entryRound: number;
  settlementRound: number;
  statusLabel: MarketPositionStatus;
}

export interface FeaturedMarketPositionViewData {
  opportunityTitle: string;
  ownerName: string;
  principal: string;
  settlementRound: number;
  statusLabel: MarketPositionStatus;
}

export interface MarketVisibilityViewData {
  currentRound: number;
  opportunityCount: number;
  positionCount: number;
  openPositionCount: number;
  opportunityTitles: string;
  opportunities: MarketOpportunityViewData[];
  positions: MarketPositionViewData[];
  featuredOpportunity?: MarketOpportunityViewData;
  featuredPosition?: FeaturedMarketPositionViewData;
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
    availableBalance: agent.availableBalance,
    reservedBalance: agent.reservedBalance,
    personalityProfile: agent.personalityProfile,
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
    totalCustodiedBalance: totalCustodiedBalance.toFixed(4),
    totalCustodiedPrincipal: totalCustodiedPrincipal.toFixed(4),
    totalCustodiedInterest: totalCustodiedInterest.toFixed(4),
    traderCustodyBalance: traderCustodyPosition?.totalBalance ?? '0.0000',
    traderCustodyPosition: traderCustodyPosition
      ? {
          principal: traderCustodyPosition.principal,
          accruedInterest: traderCustodyPosition.accruedInterest,
          totalBalance: traderCustodyPosition.totalBalance,
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
    minCommitment: opportunity.minCommitment,
    maxCommitment: opportunity.maxCommitment,
    estimatedNetReturnBps: opportunity.estimatedNetReturnBps,
    worstCaseReturnBps: opportunity.worstCaseReturnBps,
    bestCaseReturnBps: opportunity.bestCaseReturnBps,
    signalQuality: opportunity.signalQuality,
    holdingPeriodRounds: opportunity.holdingPeriodRounds,
    listedRound: opportunity.listedRound,
    settlementRound: opportunity.settlementRound,
  }));
  const positions = session.marketPositions.map((position) => {
    const ownerAgent = session.agents.find(
      (agent) => agent.id === position.ownerAgentId,
    );

    return {
      key: `${position.ownerAgentId}-${position.opportunityId}-${position.entryRound}`,
      opportunityTitle: position.opportunityTitle,
      ownerName: ownerAgent?.name ?? position.ownerAgentId,
      principal: position.principal,
      entryRound: position.entryRound,
      settlementRound: position.settlementRound,
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
    opportunityCount: opportunities.length,
    positionCount: positions.length,
    openPositionCount: openPositions.length,
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
          principal: featuredPosition.principal,
          settlementRound: featuredPosition.settlementRound,
          statusLabel: featuredPosition.statusLabel,
        }
      : undefined,
  };
}
