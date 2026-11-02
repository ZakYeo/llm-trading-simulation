import { useSyncExternalStore } from 'react';
import { parseWorkspaceRoute, workspaceHref } from '../model/navigation';
import type { WorkspaceTab } from '../model/workspace';

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useWorkspaceNavigation() {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
  const route = parseWorkspaceRoute(hash);
  return {
    ...route,
    href: (section: WorkspaceTab) => workspaceHref(route.sessionId, section),
    connect: (sessionId: string) => {
      window.location.hash = workspaceHref(sessionId);
    },
  };
}
