import {
  createAccountDetail,
  createOpportunityDetail,
  createPositionDetail,
  createUpcomingSettlements,
} from '../../session-overview/model/financial-details';
import type {
  BalanceAccountViewData,
  MarketOpportunityViewData,
  MarketPositionViewData,
} from '../../session-overview/model/session-overview';
import { createEventDetail } from '../../audit-trail/model/event-detail';
import type { AuditTrailTimelineEvent } from '../../audit-trail/model/audit-trail';
import { useEffect, useState } from 'react';
import { workspaceTabs, type DetailContent } from '../model/workspace';
import { useOperatorDashboardViewModel } from './use-operator-dashboard-view-model';
import { useTheme } from './use-theme';

export function useWorkspaceViewModel() {
  const dashboard = useOperatorDashboardViewModel();
  const theme = useTheme();
  const [detail, setDetail] = useState<DetailContent | null>(null);
  useEffect(() => {
    setDetail(null);
  }, [dashboard.navigation.sessionId, dashboard.navigation.section]);
  return {
    ...dashboard,
    theme,
    tabs: workspaceTabs,
    activeTab: dashboard.navigation.section,
    upcomingSettlements: createUpcomingSettlements(dashboard.workspace.market),
    inspectAccount: (account: BalanceAccountViewData) =>
      setDetail(createAccountDetail(account)),
    inspectOpportunity: (opportunity: MarketOpportunityViewData) =>
      setDetail(createOpportunityDetail(opportunity)),
    inspectPosition: (position: MarketPositionViewData) =>
      setDetail(createPositionDetail(position, dashboard.topbar.currentRound)),
    detail,
    inspectEvent: (event: AuditTrailTimelineEvent) =>
      setDetail(createEventDetail(event)),
    closeDetail: () => setDetail(null),
  };
}
export type WorkspaceViewModel = ReturnType<typeof useWorkspaceViewModel>;
