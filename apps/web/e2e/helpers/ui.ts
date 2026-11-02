import type { Locator, Page } from '@playwright/test';

export async function connectToSession(page: Page, sessionId: string) {
  await page.goto('/');
  await page.getByLabel('Connect to session').selectOption(sessionId);
}

export function topbarMetric(page: Page, label: string): Locator {
  return label === 'Latest activity'
    ? page.getByRole('status', { name: 'Latest activity' })
    : page.getByRole('button', { name: 'Session menu' });
}
