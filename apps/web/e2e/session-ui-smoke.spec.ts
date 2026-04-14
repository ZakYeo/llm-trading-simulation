import { expect, test, type Page } from '@playwright/test';

import {
  advanceRound,
  createBankerTraderSession,
  placeFundsWithBanker,
} from './helpers/session-api';

async function connectToSession(page: Page, sessionId: string) {
  await page.goto('/');
  await page
    .locator('label')
    .filter({ hasText: 'Or connect to session id' })
    .locator('input')
    .fill(sessionId);
}

function topbarMetric(page: Page, index: number) {
  return page.locator('.topbar-metric').nth(index);
}

test('@smoke connects to a seeded session and renders the expected numbers', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Seeded Session',
  );
  await placeFundsWithBanker(request, session, '10.0000');
  await advanceRound(request, session.id, 250);

  await connectToSession(page, session.id);

  await expect(topbarMetric(page, 0)).toContainText(
    'Playwright Seeded Session',
  );
  await expect(topbarMetric(page, 1)).toContainText('1');
  await expect(page.locator('.balance-card').first()).toContainText('110.25');
  await expect(page.locator('.balance-card').nth(1)).toContainText('90.00');
  await expect(page.locator('.treasury-shell')).toContainText('10.25');
  await expect(page.locator('.replay-panel')).toContainText(
    'Trader Bot placed funds with Banker Bot',
  );
  await expect(page.locator('.replay-panel')).toContainText(
    'Trader Bot accrued custody interest',
  );
});

test('@smoke runs one turn and updates balances, positions, and replay after completion', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Turn Session',
  );

  await connectToSession(page, session.id);
  await page.getByRole('button', { name: '1 turn' }).click();
  await page.getByRole('button', { name: /Run next 1 turn/ }).click();

  await expect(page.locator('.activity-note strong')).toContainText(
    `Ran 1 turn for session ${session.id}`,
  );
  await expect(page.locator('.balance-card').nth(1)).toContainText('95.00');
  await expect(page.locator('.balance-card').nth(1)).toContainText('5.00');
  await expect(page.locator('.market-shell')).toContainText(
    '2 opportunities / 1 position',
  );
  await expect(page.locator('.market-shell')).toContainText(
    'Binary Event Volatility',
  );
  await expect(page.locator('.replay-panel')).toContainText(
    'Trader Bot / open market position',
  );
});

test('@smoke advances one round and reflects custody accrual in the UI', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Round Session',
  );
  await placeFundsWithBanker(request, session, '10.0000');

  await connectToSession(page, session.id);
  await page.getByRole('button', { name: 'Advance round settlement' }).click();

  await expect(topbarMetric(page, 1)).toContainText('1');
  await expect(page.locator('.treasury-shell')).toContainText('10.25');
  await expect(page.locator('.treasury-shell')).toContainText('0.25');
  await expect(page.locator('.balance-card').first()).toContainText('110.25');
  await expect(page.locator('.replay-panel')).toContainText(
    'Trader Bot accrued custody interest',
  );
});

test('@smoke surfaces orchestration failures without showing fake completed-turn state', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Failure Session',
  );

  await connectToSession(page, session.id);
  await page.route(
    `http://127.0.0.1:3100/api/agents/sessions/${session.id}/rounds/orchestrate`,
    async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 500,
          message: 'Synthetic orchestrate failure.',
        }),
      });
    },
  );

  await page.getByRole('button', { name: '1 turn' }).click();
  await page.getByRole('button', { name: /Run next 1 turn/ }).click();

  await expect(page.locator('.error-copy')).toContainText(
    'Synthetic orchestrate failure.',
  );
  await expect(page.locator('.balance-card').first()).toContainText('100.00');
  await expect(page.locator('.balance-card').nth(1)).toContainText('100.00');
  await expect(page.locator('.market-shell')).toContainText(
    'No market positions opened yet.',
  );
  await expect(page.locator('.activity-note strong')).toContainText(
    'No actions yet.',
  );
});
