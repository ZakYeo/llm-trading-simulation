import { expect, test, type Page } from '@playwright/test';

import {
  advanceRound,
  createBankerTraderSession,
  placeFundsWithBanker,
} from './helpers/session-api';

async function connectToSession(page: Page, sessionId: string) {
  await page.goto('/');
  await page.getByLabel('Connect to session').selectOption(sessionId);
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
  await expect(topbarMetric(page, 1)).toContainText('2');
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

test('@smoke shows only session startup on first load and collapses it after connection', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Startup Session',
  );

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Session Startup' }),
  ).toHaveCount(1);
  await expect(page.locator('.topbar-metric')).toHaveCount(0);
  await expect(page.getByText('Run The Session')).toHaveCount(0);
  await expect(page.getByText('Audit Trail')).toHaveCount(0);
  await expect(page.getByText('Session Workspace')).toHaveCount(0);

  await page.getByLabel('Connect to session').selectOption(session.id);

  await expect(page.locator('.startup-strip')).toContainText(
    'Connected to Playwright Startup Session',
  );
  await expect(page.locator('.startup-strip')).toContainText(session.id);
  await expect(
    page.getByRole('button', { name: 'Change session' }),
  ).toBeVisible();
  await expect(page.getByText('Run The Session')).toHaveCount(1);
  await expect(page.getByText('Audit Trail')).toHaveCount(1);
  await expect(page.getByText('Session Workspace')).toHaveCount(0);

  await page.getByRole('button', { name: 'Help' }).click();
  await expect(page.getByRole('dialog')).toContainText('Custody Overview');
  await expect(page.getByRole('dialog')).toContainText('Market Visibility');
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

  await expect(topbarMetric(page, 3)).toContainText(
    `Ran 1 turn for session ${session.id}`,
  );
  await expect(page.locator('.balance-card').nth(1)).toContainText(
    /Available(?!100\.00)\d+\.\d{2}/,
  );
  await expect(page.locator('.balance-card').nth(1)).toContainText(
    /Reserved(?!0\.00)\d+\.\d{2}/,
  );
  await expect(page.locator('.market-shell')).toContainText(
    '2 opportunities / 1 position',
  );
  await expect(page.locator('.market-shell')).toContainText('Trader exposure');
  await expect(page.locator('.replay-panel')).toContainText(
    'Trader Bot / open market position',
  );
});

test('@smoke shows a live in-progress banner near the audit trail while turns are still running', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright In Progress Session',
  );

  await connectToSession(page, session.id);
  await page.route(
    `http://127.0.0.1:3100/api/agents/sessions/${session.id}/rounds/orchestrate`,
    async (route) => {
      const response = await route.fetch();

      await page.waitForTimeout(750);
      await route.fulfill({ response });
    },
  );

  await page.getByRole('button', { name: '1 turn' }).click();
  await page.getByRole('button', { name: /Run next 1 turn/ }).click();

  await expect(page.locator('.live-run-banner')).toContainText(
    'Running 1 turn...',
  );
  await expect(topbarMetric(page, 3)).toContainText(
    `Ran 1 turn for session ${session.id}`,
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

  await expect(topbarMetric(page, 1)).toContainText('2');
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
  await expect(topbarMetric(page, 3)).toContainText('Awaiting operator input');
});
