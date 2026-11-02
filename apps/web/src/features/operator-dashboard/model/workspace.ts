export type WorkspaceTab = 'Conversation' | 'Finances' | 'History';
export const workspaceTabs: WorkspaceTab[] = [
  'Conversation',
  'Finances',
  'History',
];
export type ThemePreference = 'system' | 'light' | 'dark';
export interface DetailContent {
  title: string;
  subtitle?: string;
  rows?: Array<{ label: string; value: string }>;
  paragraphs?: string[];
}
