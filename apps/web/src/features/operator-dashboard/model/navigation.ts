import type { WorkspaceTab } from './workspace';

export interface WorkspaceRoute {
  sessionId: string;
  section: WorkspaceTab;
}

export function parseWorkspaceRoute(hash: string): WorkspaceRoute {
  const match = /^#\/sessions\/([^/]+)\/(conversation|finances|history)$/.exec(
    hash,
  );
  if (!match) return { sessionId: '', section: 'Conversation' };
  try {
    return {
      sessionId: decodeURIComponent(match[1]),
      section:
        match[2] === 'finances'
          ? 'Finances'
          : match[2] === 'history'
            ? 'History'
            : 'Conversation',
    };
  } catch {
    return { sessionId: '', section: 'Conversation' };
  }
}

export function workspaceHref(
  sessionId: string,
  section: WorkspaceTab = 'Conversation',
): string {
  return sessionId
    ? `#/sessions/${encodeURIComponent(sessionId)}/${section.toLowerCase()}`
    : '#/setup';
}
