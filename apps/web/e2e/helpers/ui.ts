import type { Locator, Page } from '@playwright/test';

export async function connectToSession(page: Page, sessionId: string) {
  await page.goto('/');
  await page.getByLabel('Connect to session').selectOption(sessionId);
}

export function topbarMetric(page: Page, label: string): Locator {
  return page.locator('.topbar-metric').filter({
    has: page.locator('span', { hasText: new RegExp(`^${label}$`) }),
  });
}
