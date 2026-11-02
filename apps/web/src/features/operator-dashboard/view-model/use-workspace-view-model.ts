import { createEventDetail } from '../../audit-trail/model/event-detail';
import type { AuditTrailTimelineEvent } from '../../audit-trail/model/audit-trail';
import { useState } from 'react';
import {
  workspaceTabs,
  type WorkspaceTab,
  type DetailContent,
} from '../model/workspace';
import { useOperatorDashboardViewModel } from './use-operator-dashboard-view-model';
import { useTheme } from './use-theme';

export function useWorkspaceViewModel() {
  const dashboard = useOperatorDashboardViewModel();
  const theme = useTheme();
  const [selection, setSelection] = useState<{
    sessionId: string;
    tab: WorkspaceTab;
  }>({ sessionId: '', tab: 'Simulation' });
  const [detail, setDetail] = useState<DetailContent | null>(null);
  const sessionId = dashboard.sessionSetup.selectedSessionId;
  const activeTab =
    selection.sessionId === sessionId ? selection.tab : 'Simulation';
  return {
    ...dashboard,
    theme,
    tabs: workspaceTabs,
    activeTab,
    setActiveTab: (tab: WorkspaceTab) => {
      setDetail(null);
      setSelection({ sessionId, tab });
    },
    detail,
    showDetail: setDetail,
    inspectEvent: (event: AuditTrailTimelineEvent) =>
      setDetail(createEventDetail(event)),
    closeDetail: () => setDetail(null),
  };
}
export type WorkspaceViewModel = ReturnType<typeof useWorkspaceViewModel>;
