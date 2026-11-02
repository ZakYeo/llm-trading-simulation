import type { DetailContent } from '../../operator-dashboard/model/workspace';
import type {
  BalanceAccountViewData,
  MarketOpportunityViewData,
  MarketPositionViewData,
  MarketVisibilityViewData,
} from './session-overview';

export function createAccountDetail(
  account: BalanceAccountViewData,
): DetailContent {
  return {
    title: account.name,
    subtitle: account.role,
    rows: [
      { label: 'Available balance', value: account.availableBalanceLabel },
      { label: 'Reserved balance', value: account.reservedBalanceLabel },
      ...account.personalityRows,
      { label: 'Agent ID', value: account.id },
    ],
    paragraphs: account.personalityRows.length
      ? []
      : ['No custom personality saved.'],
  };
}
export function createOpportunityDetail(
  opportunity: MarketOpportunityViewData,
): DetailContent {
  return {
    title: opportunity.title,
    subtitle: opportunity.riskLabel,
    paragraphs: [opportunity.summary],
    rows: [
      { label: 'Min commitment', value: opportunity.minCommitmentLabel },
      { label: 'Max commitment', value: opportunity.maxCommitmentLabel },
      { label: 'Expected return', value: opportunity.estimatedNetReturnLabel },
      { label: 'Return range', value: opportunity.returnRangeLabel },
      {
        label: 'Signal quality',
        value: opportunity.signalQuality ?? 'Not available',
      },
      { label: 'Holding period', value: opportunity.holdingPeriodLabel },
      { label: 'Listed', value: opportunity.listedRoundLabel },
      { label: 'Settlement', value: opportunity.settlementRoundLabel },
    ],
  };
}
export function createPositionDetail(
  position: MarketPositionViewData,
  currentRound: number,
): DetailContent {
  return {
    title: position.opportunityTitle,
    subtitle: position.statusLabel,
    rows: [
      { label: 'Owner', value: position.ownerName },
      { label: 'Principal', value: position.principalLabel },
      { label: 'Entry round', value: position.entryRoundLabel },
      { label: 'Settlement round', value: position.settlementRoundLabel },
      { label: 'Current context', value: `Round ${currentRound}` },
      {
        label: 'Realized value',
        value: 'Not available in the current session record',
      },
    ],
  };
}
export function createUpcomingSettlements(market?: MarketVisibilityViewData) {
  return (
    market?.positions.filter(
      (position) =>
        position.statusLabel === 'Open' &&
        position.settlementRound <= market.currentRound + 1,
    ) ?? []
  );
}
