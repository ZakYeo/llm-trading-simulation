import { describe, expect, it } from 'vitest';

import type { GameSessionRecord } from '../../../lib/api';
import {
  createBalanceAccounts,
  createMarketVisibilityViewData,
  createTreasuryViewData,
} from './session-overview';

function buildSession(): GameSessionRecord {
  return {
    id: 'session-1',
    name: 'Session',
    status: 'active',
    currentRound: 2,
    agents: [
      {
        id: 'banker-1',
        name: 'Banker Bot',
        role: 'banker',
        availableBalance: '125.5000',
        reservedBalance: '10.0000',
        personalityProfile: {
          kind: 'banker',
          warmth: 7,
          salesAggression: 4,
          riskDiscipline: 9,
        },
      },
      {
        id: 'trader-1',
        name: 'Trader Bot',
        role: 'trader',
        availableBalance: '88.0000',
        reservedBalance: '12.0000',
        personalityProfile: {
          kind: 'trader',
          assertiveness: 6,
          riskAppetite: 8,
          convictionThreshold: 3,
        },
      },
    ],
    bankerCustodyPositions: [
      {
        bankerAgentId: 'banker-1',
        ownerAgentId: 'trader-1',
        principal: '20.0000',
        accruedInterest: '1.2500',
        totalBalance: '21.2500',
      },
    ],
    marketOpportunities: [
      {
        id: 'opp-1',
        templateId: 'template-1',
        category: 'event',
        title: 'Binary Event Volatility',
        summary: 'Wide payoff event trade.',
        riskLevel: 'high',
        listedRound: 2,
        settlementRound: 4,
        minCommitment: '5.0000',
        maxCommitment: '25.0000',
        estimatedNetReturnBps: 210,
        worstCaseReturnBps: -300,
        bestCaseReturnBps: 420,
        signalQuality: 'high',
        holdingPeriodRounds: 2,
      },
    ],
    marketPositions: [
      {
        opportunityId: 'opp-1',
        ownerAgentId: 'trader-1',
        opportunityTitle: 'Binary Event Volatility',
        principal: '12.0000',
        entryRound: 2,
        settlementRound: 4,
        entryFeeBps: 25,
        entryFeeAmount: '0.0300',
        entrySlippageBps: -15,
        effectiveResolutionReturnBps: 195,
      },
    ],
  };
}

describe('session overview display models', () => {
  it('maps account balances and personality rows into view-ready labels', () => {
    const accounts = createBalanceAccounts(buildSession());

    expect(accounts[0]).toMatchObject({
      name: 'Banker Bot',
      availableBalanceLabel: '125.50',
      reservedBalanceLabel: '10.00',
      personalityRows: [
        { label: 'Warmth', value: '7/10' },
        { label: 'Sales aggression', value: '4/10' },
        { label: 'Risk discipline', value: '9/10' },
      ],
    });
    expect(accounts[1]?.personalityRows).toEqual([
      { label: 'Assertiveness', value: '6/10' },
      { label: 'Risk appetite', value: '8/10' },
      { label: 'Conviction threshold', value: '3/10' },
    ]);
  });

  it('maps missing personality profiles to empty display rows', () => {
    const session = buildSession();
    session.agents[0] = {
      ...session.agents[0],
      personalityProfile: undefined,
    };

    expect(createBalanceAccounts(session)[0]?.personalityRows).toEqual([]);
  });

  it('maps treasury totals and trader custody into formatted labels', () => {
    const treasury = createTreasuryViewData(buildSession());

    expect(treasury).toMatchObject({
      totalCustodiedBalanceLabel: '21.25',
      totalCustodiedPrincipalLabel: '20.00',
      totalCustodiedInterestLabel: '1.25',
      traderCustodyBalanceLabel: '21.25',
      traderCustodyPosition: {
        principalLabel: '20.00',
        accruedInterestLabel: '1.25',
        totalBalanceLabel: '21.25',
      },
    });
  });

  it('maps market opportunities and positions into redesign-friendly display props', () => {
    const market = createMarketVisibilityViewData(buildSession());

    expect(market).toMatchObject({
      currentRoundLabel: 'Round 2',
      opportunityPositionSummaryLabel: '1 opportunity / 1 position',
      featuredOpportunitySummary:
        '5.00 to 25.00 · +210 bps · high signal · 2 round hold',
      featuredPositionSummary: 'Binary Event Volatility · 12.00',
      featuredPositionDetail: 'Trader Bot · Open · Round 4',
    });
    expect(market?.opportunities[0]).toMatchObject({
      riskLabel: 'High risk',
      minCommitmentLabel: '5.00',
      maxCommitmentLabel: '25.00',
      estimatedNetReturnLabel: '+210 bps',
      returnRangeLabel: '-300 bps to +420 bps',
      holdingPeriodLabel: '2 rounds',
      listedRoundLabel: 'Round 2',
      settlementRoundLabel: 'Round 4',
    });
    expect(market?.positions[0]).toMatchObject({
      principalLabel: '12.00',
      entryRoundLabel: 'Round 2',
      settlementRoundLabel: 'Round 4',
      statusLabel: 'Open',
    });
  });
});
